import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsWidgetProps {
  label: string
  value: string
  variant?: 'default' | 'success' | 'warning' | 'info'
}

export default function StatsWidget({ label, value, variant = 'default' }: StatsWidgetProps) {
  const variantColors = {
    default: 'text-foreground',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold', variantColors[variant])}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}
