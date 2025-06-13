import type React from "react"
import { cn } from "@/lib/utils"
import { Card } from "./ui/card"

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

  header,

}: {
  className?: string

  header?: React.ReactNode

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
