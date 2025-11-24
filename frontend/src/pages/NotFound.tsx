import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-4 text-xl text-muted-foreground">Page not found</p>
        <Link to="/" className="mt-8 inline-block">
          <Button>Go back home</Button>
        </Link>
      </div>
    </div>
  )
}
