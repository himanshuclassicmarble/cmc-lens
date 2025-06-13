import type React from "react"
import { cn } from "@/lib/utils"
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card"

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) => {
  return (
    <div className={cn("mx-auto grid  grid-cols-1 gap-2 md:auto-rows-[18rem] md:grid-cols-3", className)}>
      {children}
    </div>
  )
}

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string
  title?: string | React.ReactNode
  description?: string | React.ReactNode
  header?: React.ReactNode
  icon?: React.ReactNode
}) => {
  return (
    <Card
      className={cn(
        "group/bento",
        className,
      )}
    >
  
      {header}

    </Card>
  )
}
