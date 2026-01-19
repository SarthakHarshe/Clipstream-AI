"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background p-6 md:p-12 font-sans selection:bg-primary selection:text-white">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Link>

                <h1 className="font-display text-4xl md:text-5xl uppercase font-bold tracking-tight mb-8">Terms of Service</h1>

                <div className="space-y-8 text-muted-foreground text-sm leading-relaxed">
                    <p>Last updated: January 2024</p>

                    <section>
                        <h2 className="text-foreground font-bold uppercase tracking-widest mb-4">1. Acceptance of Terms</h2>
                        <p>By accessing or using Clipstream AI, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
                    </section>

                    <section>
                        <h2 className="text-foreground font-bold uppercase tracking-widest mb-4">2. Usage Rights</h2>
                        <p>Clipstream AI grants you a limited, non-exclusive, non-transferable license to use the service for personal or commercial purposes, provided you comply with these terms.</p>
                    </section>

                    <section>
                        <h2 className="text-foreground font-bold uppercase tracking-widest mb-4">3. Disclaimer of Warranties</h2>
                        <p>The service is provided "as is" and "as available" without any warranties of any kind. We do not guarantee that the service will be uninterrupted, secure, or error-free.</p>
                    </section>

                    <section>
                        <h2 className="text-foreground font-bold uppercase tracking-widest mb-4">4. Limitation of Liability</h2>
                        <p>In no event shall Clipstream AI be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
