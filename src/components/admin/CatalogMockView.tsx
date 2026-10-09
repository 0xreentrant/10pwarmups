import { useEffect, useState } from "react"
import { captureAdminHash, googleSignInHref, readAdminToken } from "../../utils/taggerApi"
import { fetchCatalog, writeCatalog, type CatalogPayload, type CatalogSection } from "../../data/catalog"

type Section = CatalogSection
type Entry = { id: string; title: string; sectionId: string }
type View =
  | { kind: "list" }
  | { kind: "edit"; id: string; title: string; sectionId: string }
  | { kind: "create"; title: string; sectionId: string }
  | { kind: "sections" }

function entriesFrom(payload: CatalogPayload): Entry[] {
  return payload.warmups.map(warmup => ({
    id: warmup.id,
    title: warmup.title,
    sectionId: warmup.sectionId,
  }))
}

export default function CatalogMockView() {
  const [sections, setSections] = useState<Section[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [view, setView] = useState<View>({ kind: "list" })
  const [query, setQuery] = useState("")
  const [sectionFilter, setSectionFilter] = useState<string>("all")
  const [newSectionId, setNewSectionId] = useState("")
  const [newSectionName, setNewSectionName] = useState("")
  const [sectionError, setSectionError] = useState("")
  const [loadError, setLoadError] = useState("")
  const [authError, setAuthError] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  function applyPayload(payload: CatalogPayload) {
    setSections(payload.sections)
    setEntries(entriesFrom(payload))
  }

  useEffect(() => {
    const captured = captureAdminHash()
    if (captured === "not_admin") setAuthError("This Google account is not an admin.")
    if (captured === "not_verified") setAuthError("Google email is not verified.")
    setSignedIn(Boolean(readAdminToken()))
    void fetchCatalog()
      .then(payload => {
        applyPayload(payload)
        setLoadError("")
      })
      .catch(err => {
        setLoadError(err instanceof Error ? err.message : "Could not load catalog")
      })
      .finally(() => setLoaded(true))
  }, [])

  const sectionName = (id: string) => sections.find(section => section.id === id)?.name ?? id

  function openCreate() {
    setView({
      kind: "create",
      title: "",
      sectionId: sectionFilter === "all" ? (sections[0]?.id ?? "A") : sectionFilter,
    })
  }

  function openEdit(entry: Entry) {
    setView({ kind: "edit", id: entry.id, title: entry.title, sectionId: entry.sectionId })
  }

  async function saveEdit(id: string, title: string, sectionId: string) {
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      const payload = await writeCatalog(`/api/catalog/warmups/${encodeURIComponent(id)}`, "PATCH", {
        title: trimmed,
        sectionId,
      })
      applyPayload(payload)
      setView({ kind: "list" })
    } catch (err) {
      noteSaveError(err)
    }
  }

  async function publish(title: string, sectionId: string) {
    const trimmed = title.trim()
    if (!trimmed) return
    try {
      const payload = await writeCatalog("/api/catalog/warmups", "POST", { title: trimmed, sectionId })
      applyPayload(payload)
      setQuery("")
      setSectionFilter("all")
      setView({ kind: "list" })
    } catch (err) {
      noteSaveError(err)
    }
  }

  function noteSaveError(err: unknown) {
    const message = err instanceof Error ? err.message : "Save failed"
    if (message === "Sign in with Google") {
      setSignedIn(false)
      setAuthError(message)
      return
    }
    setLoadError(message)
  }

  async function addSection() {
    const id = newSectionId.trim().toUpperCase()
    const name = newSectionName.trim()
    if (!id || !name) return
    if (sections.some(section => section.id === id)) {
      setSectionError("That id is already used.")
      return
    }
    try {
      const payload = await writeCatalog("/api/catalog/sections", "POST", { id, name })
      applyPayload(payload)
      setNewSectionId("")
      setNewSectionName("")
      setSectionError("")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed"
      if (message === "Sign in with Google") {
        setSignedIn(false)
        setAuthError(message)
        return
      }
      setSectionError(message)
    }
  }

  const needle = query.trim().toLowerCase()
  const visible = entries.filter(entry => {
    if (sectionFilter !== "all" && entry.sectionId !== sectionFilter) return false
    if (!needle) return true
    return entry.title.toLowerCase().includes(needle) || entry.id.toLowerCase().includes(needle)
  })

  return (
    <div className="catalog-admin">
      <header className="ca-bar">
        <div className="ca-bar-left">
          <span className="ca-mark">10p</span>
          <span className="ca-bar-name">Warmups</span>
        </div>
        <div className="ca-bar-right">
          <a href="/">Visit site</a>
          <span>Howdy, admin</span>
        </div>
      </header>
      <div className="ca-body">
        <nav className="ca-menu" aria-label="Catalog">
          <button
            type="button"
            aria-current={view.kind === "list" || view.kind === "edit" ? "page" : undefined}
            onClick={() => setView({ kind: "list" })}
          >
            Warmups
          </button>
          <button
            type="button"
            aria-current={view.kind === "create" ? "page" : undefined}
            onClick={openCreate}
          >
            Add New
          </button>
          <button
            type="button"
            aria-current={view.kind === "sections" ? "page" : undefined}
            onClick={() => setView({ kind: "sections" })}
          >
            Sections
          </button>
        </nav>
        <main className="ca-content">
          {authError && <p className="ca-error" role="alert">{authError}</p>}
          {!signedIn && (
            <p className="ca-notice">
              <a href={googleSignInHref("/admin", window.location.origin)}>Sign in with Google</a>
              {" "}to save changes.
            </p>
          )}
          {loadError && <p className="ca-error" role="alert">{loadError}</p>}
          {!loaded && <p>Loading warmups.</p>}
          {loaded && view.kind === "list" && (
            <ListScreen
              entries={visible}
              total={entries.length}
              sections={sections}
              sectionFilter={sectionFilter}
              query={query}
              sectionName={sectionName}
              onQuery={setQuery}
              onFilter={setSectionFilter}
              onCreate={openCreate}
              onEdit={openEdit}
            />
          )}
          {loaded && view.kind === "edit" && (
            <EditScreen
              key={view.id}
              heading="Edit Warmup"
              submitLabel="Update"
              id={view.id}
              title={view.title}
              sectionId={view.sectionId}
              sections={sections}
              onCancel={() => setView({ kind: "list" })}
              onSubmit={next => saveEdit(view.id, next.title, next.sectionId)}
            />
          )}
          {loaded && view.kind === "create" && (
            <EditScreen
              key="create"
              heading="Add New Warmup"
              submitLabel="Publish"
              title={view.title}
              sectionId={view.sectionId}
              sections={sections}
              onCancel={() => setView({ kind: "list" })}
              onSubmit={next => publish(next.title, next.sectionId)}
            />
          )}
          {loaded && view.kind === "sections" && (
            <SectionsScreen
              sections={sections}
              entries={entries}
              newSectionId={newSectionId}
              newSectionName={newSectionName}
              sectionError={sectionError}
              onId={value => {
                setNewSectionId(value)
                setSectionError("")
              }}
              onName={setNewSectionName}
              onAdd={addSection}
              onRename={(id, name) => {
                setSections(prev => prev.map(section => section.id === id ? { ...section, name } : section))
              }}
              onRenameCommit={(id, name) => {
                void writeCatalog(`/api/catalog/sections/${encodeURIComponent(id)}`, "PATCH", { name })
                  .then(applyPayload)
                  .catch(noteSaveError)
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function ListScreen({
  entries,
  total,
  sections,
  sectionFilter,
  query,
  sectionName,
  onQuery,
  onFilter,
  onCreate,
  onEdit,
}: {
  entries: Entry[]
  total: number
  sections: Section[]
  sectionFilter: string
  query: string
  sectionName: (id: string) => string
  onQuery: (value: string) => void
  onFilter: (id: string) => void
  onCreate: () => void
  onEdit: (entry: Entry) => void
}) {
  return (
    <>
      <div className="ca-heading">
        <h1>Warmups</h1>
        <button type="button" className="ca-title-action" onClick={onCreate}>Add New</button>
      </div>
      <div className="ca-list-tools">
        <ul className="ca-filters">
          <li>
            <button type="button" aria-current={sectionFilter === "all" ? "page" : undefined} onClick={() => onFilter("all")}>
              All ({total})
            </button>
          </li>
          {sections.map(section => (
            <li key={section.id}>
              <button
                type="button"
                aria-current={sectionFilter === section.id ? "page" : undefined}
                onClick={() => onFilter(section.id)}
              >
                {section.name}
              </button>
            </li>
          ))}
        </ul>
        <form
          className="ca-search"
          onSubmit={event => event.preventDefault()}
        >
          <label>
            <span className="ca-sr">Search warmups</span>
            <input
              className="ca-input"
              value={query}
              placeholder="Search warmups"
              onChange={event => onQuery(event.target.value)}
            />
          </label>
        </form>
      </div>
      <div className="ca-table-wrap">
        <table className="ca-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Section</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={3}>No warmups found.</td>
              </tr>
            )}
            {entries.map(entry => (
              <tr key={entry.id}>
                <td>
                  <button type="button" className="ca-row-title" onClick={() => onEdit(entry)}>
                    {entry.title}
                  </button>
                </td>
                <td>
                  <button type="button" className="ca-link" onClick={() => onFilter(entry.sectionId)}>
                    {sectionName(entry.sectionId)}
                  </button>
                </td>
                <td>{entry.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function EditScreen({
  heading,
  submitLabel,
  id,
  title,
  sectionId,
  sections,
  onCancel,
  onSubmit,
}: {
  heading: string
  submitLabel: string
  id?: string
  title: string
  sectionId: string
  sections: Section[]
  onCancel: () => void
  onSubmit: (next: { title: string; sectionId: string }) => void
}) {
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftSection, setDraftSection] = useState(sectionId)
  const titleLabel = id ? `${id} title` : "New entry title"
  const sectionLabel = id ? `${id} section` : "Section"

  return (
    <form
      onSubmit={event => {
        event.preventDefault()
        onSubmit({ title: draftTitle, sectionId: draftSection })
      }}
    >
      <div className="ca-heading">
        <h1>{heading}</h1>
      </div>
      <div className="ca-editor">
        <div>
          <label className="ca-field">
            <span className="ca-sr">{titleLabel}</span>
            <input
              className="ca-input ca-title-input"
              aria-label={titleLabel}
              placeholder="Add title"
              value={draftTitle}
              onChange={event => setDraftTitle(event.target.value)}
            />
          </label>
          {id && <p className="ca-permalink">ID: {id}</p>}
        </div>
        <div className="ca-side">
          <section className="ca-box">
            <h2>Publish</h2>
            <div className="ca-inside ca-publish">
              <button type="button" className="ca-btn" onClick={onCancel}>Cancel</button>
              <button type="submit" className="ca-btn ca-btn-primary" disabled={!draftTitle.trim()}>
                {submitLabel}
              </button>
            </div>
          </section>
          <section className="ca-box">
            <h2>Section</h2>
            <div className="ca-inside">
              <label className="ca-field">
                <span className="ca-sr">{sectionLabel}</span>
                <select
                  className="ca-select"
                  aria-label={sectionLabel}
                  value={draftSection}
                  onChange={event => setDraftSection(event.target.value)}
                >
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </div>
      </div>
    </form>
  )
}

function SectionsScreen({
  sections,
  entries,
  newSectionId,
  newSectionName,
  sectionError,
  onId,
  onName,
  onAdd,
  onRename,
  onRenameCommit,
}: {
  sections: Section[]
  entries: Entry[]
  newSectionId: string
  newSectionName: string
  sectionError: string
  onId: (value: string) => void
  onName: (value: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onRenameCommit: (id: string, name: string) => void
}) {
  return (
    <>
      <div className="ca-heading">
        <h1>Sections</h1>
      </div>
      <div className="ca-split">
        <form
          className="ca-add-section"
          onSubmit={event => {
            event.preventDefault()
            onAdd()
          }}
        >
          <h2>Add New Section</h2>
          <label className="ca-field">
            New section name
            <input
              className="ca-input"
              value={newSectionName}
              onChange={event => onName(event.target.value)}
            />
          </label>
          <label className="ca-field">
            New section id
            <input
              className="ca-input"
              value={newSectionId}
              onChange={event => onId(event.target.value)}
            />
          </label>
          <p className="ca-help">Letter id used on new warmups, like I.</p>
          {sectionError && <p className="ca-error" role="alert">{sectionError}</p>}
          <button type="submit" className="ca-btn ca-btn-primary" disabled={!newSectionId.trim() || !newSectionName.trim()}>
            Add section
          </button>
        </form>
        <div className="ca-table-wrap">
          <table className="ca-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Id</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <tr key={section.id}>
                  <td>
                    <input
                      className="ca-input"
                      aria-label={`Section ${section.id} name`}
                      value={section.name}
                      onChange={event => onRename(section.id, event.target.value)}
                      onBlur={event => onRenameCommit(section.id, event.target.value)}
                    />
                  </td>
                  <td>{section.id}</td>
                  <td>{entries.filter(entry => entry.sectionId === section.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
