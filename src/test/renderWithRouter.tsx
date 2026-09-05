import { act, render } from "@testing-library/react"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import { routeTree } from "../router"

export function createTestRouter(initialPath = "/") {
  const history = createMemoryHistory({ initialEntries: [initialPath] })
  const router = createRouter({
    routeTree,
    history,
  })
  return { router, history }
}

export async function renderWithRouter(initialPath = "/") {
  const { router, history } = createTestRouter(initialPath)
  // Transitioner loads + emits on mount; keep those updates inside act so React
  // does not warn about state updates outside the test harness.
  const result = await act(async () => {
    const rendered = render(<RouterProvider router={router} />)
    await router.load()
    return rendered
  })
  return {
    ...result,
    router,
    history,
  }
}
