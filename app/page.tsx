"use client"

import { Search, Upload } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

type App = {
  name: string;
  href: string;
  icon: React.ReactNode;
  accentColor: string;
  textColor: string;
};

function AppCard({ app, index }: { app: App; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="group"
    >
      <Link href={app.href} className="flex flex-col items-center space-y-2">
        <motion.div
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={`p-4 bg-gradient-to-br ${app.accentColor} rounded-xl`}
        >
          {app.icon}
        </motion.div>
        <span className={`text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:${app.textColor}`}>
          {app.name}
        </span>
      </Link>
    </motion.div>
  )
}

export default function HomePage() {
  const apps = [
    {
      name: "Lens Search",
      href: "/lens",
      icon: <Search className="w-8 h-8 text-white" />,
      accentColor: "from-blue-500 to-cyan-500",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      name: "Upload",
      href: "/pinecone-image-upload",
      icon: <Upload className="w-8 h-8 text-white" />,
      accentColor: "from-purple-500 to-pink-500",
      textColor: "text-purple-600 dark:text-purple-400",
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 gap-8 w-full max-w-xs"
      >
        <AnimatePresence>
          {apps.map((app, index) => (
            <AppCard key={app.name} app={app} index={index} />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}