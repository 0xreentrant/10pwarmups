import { render } from "@testing-library/react"
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
  await router.load()
  const result = render(<RouterProvider router={router} />)
  return {
    ...result,
    router,
    history,
  }
}
