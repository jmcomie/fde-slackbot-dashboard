import { createHashRouter, RouterProvider } from 'react-router-dom'
import { SupabaseProvider } from './context/SupabaseContext'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Messages from './pages/Messages'
import Bugs from './pages/Bugs'
import Concerns from './pages/Concerns'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'messages',
        element: <Messages />,
      },
      {
        path: 'bugs',
        element: <Bugs />,
      },
      {
        path: 'concerns',
        element: <Concerns />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
])

function App() {
  return (
    <SupabaseProvider>
      <RouterProvider router={router} />
    </SupabaseProvider>
  )
}

export default App
