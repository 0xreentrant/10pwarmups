type PutRepoFileArgs = {
  repo: string
  branch: string
  token: string
  path: string
  content: string
  message: string
  fetchImpl?: typeof fetch
}

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "10pwarmups-tagger",
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

export async function putRepoFile(args: PutRepoFileArgs): Promise<void> {
  const fetchImpl = args.fetchImpl ?? fetch
  const url = `https://api.github.com/repos/${args.repo}/contents/${args.path}`
  const current = await fetchImpl(`${url}?ref=${encodeURIComponent(args.branch)}`, {
    headers: githubHeaders(args.token),
  })
  let sha: string | undefined
  if (current.status === 404) {
    sha = undefined
  } else if (!current.ok) {
    throw new Error(`GitHub read failed (${current.status})`)
  } else {
    const body = (await current.json()) as { sha?: unknown }
    if (typeof body.sha !== "string") throw new Error("GitHub read missing sha")
    sha = body.sha
  }

  const put = await fetchImpl(url, {
    method: "PUT",
    headers: {
      ...githubHeaders(args.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: args.message,
      content: Buffer.from(args.content, "utf8").toString("base64"),
      branch: args.branch,
      sha,
    }),
  })
  if (put.status === 409) throw new Error("changed upstream, reload")
  if (!put.ok) throw new Error(`GitHub write failed (${put.status})`)
}

export async function readRepoFile(args: {
  repo: string
  branch: string
  token: string
  path: string
  fetchImpl?: typeof fetch
}): Promise<string> {
  const fetchImpl = args.fetchImpl ?? fetch
  const url = `https://api.github.com/repos/${args.repo}/contents/${args.path}?ref=${encodeURIComponent(args.branch)}`
  const res = await fetchImpl(url, { headers: githubHeaders(args.token) })
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`)
  const body = (await res.json()) as { content?: unknown; encoding?: unknown }
  if (typeof body.content !== "string" || body.encoding !== "base64") {
    throw new Error("GitHub read missing content")
  }
  return Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf8")
}
