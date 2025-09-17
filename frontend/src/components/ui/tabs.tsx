import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface TabsContextValue {
    value: string
    onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

interface TabsProps {
    defaultValue?: string
    value?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
    className?: string
}

const Tabs: React.FC<TabsProps> = ({
    defaultValue,
    value: controlledValue,
    onValueChange,
    children,
    className
}) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || "")

    const value = controlledValue ?? internalValue
    const handleValueChange = (newValue: string) => {
        if (controlledValue === undefined) {
            setInternalValue(newValue)
        }
        onValueChange?.(newValue)
    }

    return (
        <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div className={className}>
                {children}
            </div>
        </TabsContext.Provider>
    )
}

interface TabsListProps {
    children: React.ReactNode
    className?: string
}

const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
    return (
        <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>
            {children}
        </div>
    )
}

interface TabsTriggerProps {
    value: string
    children: React.ReactNode
    className?: string
}

const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className }) => {
    const context = React.useContext(TabsContext)
    if (!context) {
        throw new Error("TabsTrigger must be used within a Tabs component")
    }

    const isActive = context.value === value

    return (
        <Button
            variant={isActive ? "default" : "secondary"}
            size="sm"
            className={cn(
                "inline-flex items-center justify-center hover:bg-white whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive && "bg-background text-foreground shadow-sm",
                className
            )}
            onClick={() => context.onValueChange(value)}
        >
            {children}
        </Button>
    )
}

interface TabsContentProps {
    value: string
    children: React.ReactNode
    className?: string
}

const TabsContent: React.FC<TabsContentProps> = ({ value, children, className }) => {
    const context = React.useContext(TabsContext)
    if (!context) {
        throw new Error("TabsContent must be used within a Tabs component")
    }

    if (context.value !== value) {
        return null
    }

    return (
        <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
            {children}
        </div>
    )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
