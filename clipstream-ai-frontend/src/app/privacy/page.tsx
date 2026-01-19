"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background p-6 md:p-12 font-sans selection:bg-primary selection:text-white">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Link>

                <h1 className="font-display text-4xl md:text-5xl uppercase font-bold tracking-tight mb-8">Privacy Policy</h1>

                <div className="space-y-8 text-muted-foreground text-sm leading-relaxed">
                    <p>Last updated: January 2024</p>

                    <section>
                        <h2 className="text-foreground font-bold uppercase tracking-widest mb-4">1. No Affiliation</h2>
                        <p>Clipstream AI ("we", "our") is an independent tool and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with YouTube, Google, or any of their subsidiaries or affiliates.</p>
                    </section>

                    <section>
                        <h2 className="text-foreground font-bold uppercase tracking-widest mb-4">2. Data Processing</h2>
                        <p>Clipstream AI allows users to process videos locally or via temporary cloud instances. We do not permanently store, view, or claim ownership of any content you upload or process using our service.</p>
                    </section>

                    <section>
                        <h2 className="text-foreground font-bold uppercase tracking-widest mb-4">3. User Responsibility</h2>
                        <p>You acknowledge that you are solely responsible for the content you upload, process, or download using Clipstream AI. You agree to use this service in compliance with all applicable laws and regulations, including copyright laws. We accept no liability for any misuse of the service.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
