"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { ArrowRight, Check, UploadCloud, Zap, Smartphone, Layers, ShieldCheck, Globe } from "lucide-react";
import { SwissGrid, SwissSection } from "~/components/ui/swiss-grid";
import { motion } from "framer-motion";
import { SplitVideoAnimation } from "~/components/landing/split-video-animation";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary selection:text-white">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <SwissGrid className="py-4" showLines={false}>
          <div className="col-span-4 md:col-span-3 flex items-center">
            <span className="font-display font-bold text-xl tracking-tighter uppercase">Clipstream.</span>
          </div>
          <div className="col-span-0 md:col-span-6 hidden md:flex items-center justify-center gap-8">
            {/* Nav links removed as requested */}
          </div>
          <div className="col-span-4 md:col-span-3 flex justify-end gap-4 items-center">
            <Link href="/login" className="text-xs uppercase tracking-widest font-bold hover:text-primary transition-colors">Sign In</Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-none uppercase text-[10px] h-9 font-bold tracking-widest">Get Started</Button>
            </Link>
          </div>
        </SwissGrid>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 border-b border-white/10">
        <SwissGrid>
          <div className="col-span-4 md:col-span-6 flex flex-col justify-center">

            {/* REMOVED v2.0 System Online badge as requested */}

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tight leading-[0.9] mb-8"
            >
              Turn Long Video<br />
              Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Viral Shorts</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10"
            >
              The advanced AI engine that identifies viral moments, reframes for vertical, and generates captions automatically.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-sm rounded-none uppercase font-bold tracking-widest bg-primary hover:bg-primary/90 text-white">
                  Start Creating Free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-center sm:justify-start h-14 px-4 border border-white/10">
                <Check className="w-3 h-3 text-green-500 mr-2" /> No credit card required
              </p>
            </motion.div>
          </div>

          {/* Animation Section */}
          <div className="col-span-4 md:col-span-6 relative mt-12 md:mt-0 flex items-center justify-center">
            <div className="w-full border border-white/10 bg-white/[0.02]">
              <SplitVideoAnimation />
            </div>
          </div>
        </SwissGrid>
      </section>

      {/* REMOVED STATS SECTION (100k+, 98%, ~12s) as requested */}

      {/* HOW IT WORKS */}
      <SwissSection id="how-it-works" className="py-32">
        <SwissGrid>
          <div className="col-span-4 md:col-span-4 mb-16 md:mb-0">
            <span className="text-primary text-xs uppercase tracking-widest font-bold block mb-4">Workflow</span>
            <h2 className="font-display text-4xl md:text-5xl uppercase font-bold leading-none mb-6">From Long<br />To Short<br />In Seconds.</h2>
            <p className="text-muted-foreground text-sm max-w-sm">Our automated pipeline handles the complex editing decisions so you can focus on distribution.</p>
          </div>
          <div className="col-span-4 md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: UploadCloud, title: "1. Upload", desc: "Drop your standard 16:9 videos or podcast recordings." }, // Removed "Youtube"
              { icon: Layers, title: "2. Analyze", desc: "AI identifies hooks, speakers, and viral moments automatically." },
              { icon: Smartphone, title: "3. Export", desc: "Get perfectly framed 9:16 vertical shorts ready for publishing." } // Removed "TikTok"
            ].map((step, i) => (
              <div key={i} className="group border border-white/10 bg-white/5 p-8 hover:border-primary/50 transition-colors relative overflow-hidden">
                <div className="text-5xl font-display font-bold text-white/5 absolute top-4 right-4">{i + 1}</div>
                <step.icon className="w-8 h-8 text-primary mb-6" />
                <h3 className="font-display text-lg uppercase font-bold mb-3">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </SwissGrid>
      </SwissSection>

      {/* FEATURE GRID (BENTO) */}
      <SwissSection id="features" className="py-32 bg-white/[0.02]">
        <SwissGrid>
          <div className="col-span-4 md:col-span-12 text-center mb-20">
            <span className="text-primary text-xs uppercase tracking-widest font-bold block mb-4">System Capabilities</span>
            <h2 className="font-display text-4xl md:text-5xl uppercase font-bold">Everything you need</h2>
          </div>

          <div className="col-span-4 md:col-span-12 grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 h-[800px] md:h-[600px]">
            {/* Large Feature 1 */}
            <div className="md:col-span-2 md:row-span-2 border border-white/10 bg-black relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="p-8 h-full flex flex-col justify-end relative z-10">
                <div className="bg-primary/20 w-fit p-3 mb-6"><Zap className="w-6 h-6 text-primary" /></div>
                <h3 className="font-display text-3xl uppercase font-bold mb-4">Active Speaker Detection</h3>
                <p className="text-muted-foreground max-w-md">Our AI doesn't just crop the center. It tracks faces and active speakers, dynamically cutting between multiple people in a podcast or interview setting.</p>
              </div>
              {/* Visual representation */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] border border-white/5 rounded-full animate-[spin_60s_linear_infinite] opacity-20 pointer-events-none" />
            </div>

            {/* Feature 2 */}
            <div className="border border-white/10 bg-black p-8 flex flex-col justify-between group hover:border-white/20 transition-colors">
              <Globe className="w-8 h-8 text-white mb-4" />
              <div>
                <h3 className="font-display text-xl uppercase font-bold mb-2">Auto-Captioning</h3>
                <p className="text-xs text-muted-foreground">High accuracy transcription in English.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="border border-white/10 bg-black p-8 flex flex-col justify-between group hover:border-white/20 transition-colors">
              <ShieldCheck className="w-8 h-8 text-white mb-4" />
              <div>
                <h3 className="font-display text-xl uppercase font-bold mb-2">Secure Processing</h3>
                <p className="text-xs text-muted-foreground">Your content is processed privately and deleted after use.</p>
              </div>
            </div>
          </div>
        </SwissGrid>
      </SwissSection>

      {/* CTA SECTION */}
      <section className="py-32 border-t border-white/10">
        <SwissGrid>
          <div className="col-span-4 md:col-span-12 text-center">
            <h2 className="font-display text-5xl md:text-8xl uppercase font-bold tracking-tighter mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
              Ready to Create?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-12 text-lg">
              Join now and start creating.
            </p>
            <Link href="/signup">
              <Button size="lg" className="h-16 px-12 text-lg rounded-none uppercase font-bold tracking-widest bg-white text-black hover:bg-white/90">
                Get Started Now
              </Button>
            </Link>
            <p className="mt-6 text-[10px] uppercase tracking-widest text-muted-foreground">
              No Card Required
            </p>
          </div>
        </SwissGrid>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-black py-12">
        <SwissGrid>
          <div className="col-span-2 md:col-span-6">
            <span className="font-display font-bold text-xl uppercase tracking-tighter">Clipstream.</span>
            <p className="text-xs text-muted-foreground mt-4 max-w-xs">
              The advanced vertical video formatting engine for modern creators.
            </p>
          </div>
          <div className="col-span-2 md:col-span-2">
            <h4 className="text-[10px] uppercase tracking-widest font-bold mb-4 text-white">Product</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link href="/login" className="hover:text-primary">Login</Link></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-2 mt-8 md:mt-0">
            <h4 className="text-[10px] uppercase tracking-widest font-bold mb-4 text-white">Legal</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-primary">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-primary">Terms</Link></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-2 mt-8 md:mt-0">
            <h4 className="text-[10px] uppercase tracking-widest font-bold mb-4 text-white">Social</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link href="https://x.com/Magframed" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Twitter</Link></li>
              <li><Link href="https://github.com/sarthakHarshe" target="_blank" rel="noopener noreferrer" className="hover:text-primary">GitHub</Link></li>
            </ul>
          </div>
          <div className="col-span-4 md:col-span-12 mt-12 pt-8 border-t border-white/10 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
            © 2024 Clipstream AI. All systems nominal.
          </div>
        </SwissGrid>
      </footer>
    </main>
  );
}
