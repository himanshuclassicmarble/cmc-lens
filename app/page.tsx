"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Gem, Search, Zap } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-3 mb-6">
            <Gem className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">MarbleAI</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Advanced marble analysis and identification using artificial intelligence
          </p>
        </div>

        {/* Main Action Card */}
        <Card className="mb-8 border-2 border-blue-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Camera className="h-6 w-6" />
              Marble Analyzer
            </CardTitle>
            <CardDescription className="text-lg">
              Capture or upload an image to analyze marble samples with AI
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/marble-analyzer">
              <Button size="lg" className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                Start Analysis
                <Zap className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                Smart Capture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Use your camera to capture marble samples with intelligent cropping and optimization
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-green-600" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Advanced AI identifies material type, patterns, colors, and surface finish properties
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                Fast Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Get detailed analysis results in seconds with optimized processing pipeline
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <Card className="bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold mb-2">Capture</h3>
                <p className="text-gray-600 text-sm">
                  Take a photo or upload an image of your marble sample
                </p>
              </div>
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">2</span>
                </div>
                <h3 className="font-semibold mb-2">Analyze</h3>
                <p className="text-gray-600 text-sm">
                  AI processes the image to identify key characteristics
                </p>
              </div>
              <div>
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">3</span>
                </div>
                <h3 className="font-semibold mb-2">Results</h3>
                <p className="text-gray-600 text-sm">
                  Get detailed analysis with material properties and insights
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>Powered by advanced AI and machine learning technology</p>
        </div>
      </div>
    </div>
  )
}
