import Link from "next/link";

/**
 * HomePage Component
 *
 * This is the main landing page of the ClipStream AI application. It serves as the entry point
 * for users visiting the site, providing navigation to key documentation and getting started guides.
 *
 * The page uses a gradient background with a modern card-based layout that's responsive
 * across different screen sizes. The design follows the T3 stack branding with purple accents.
 *
 * Key Features:
 * - Responsive design that works on mobile, tablet, and desktop
 * - Gradient background for visual appeal
 * - Card-based navigation links to documentation
 * - Hover effects for better user interaction feedback
 */
export default function HomePage() {
  return (
    // Main container with full viewport height and gradient background
    // The gradient goes from dark purple to darker blue for a modern look
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      {/* Content container with responsive padding and centered layout */}
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        {/* Main heading with responsive text sizing */}
        {/* Uses a custom purple color for the "T3" text to match branding */}
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
          Create <span className="text-[hsl(280,100%,70%)]">T3</span> App
        </h1>

        {/* Grid layout for navigation cards - responsive from 1 column on mobile to 2 on larger screens */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          {/* First Steps Documentation Link */}
          {/* Card with hover effects and semi-transparent background */}
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
            href="https://create.t3.gg/en/usage/first-steps"
            target="_blank"
          >
            <h3 className="text-2xl font-bold">First Steps →</h3>
            <div className="text-lg">
              Just the basics - Everything you need to know to set up your
              database and authentication.
            </div>
          </Link>

          {/* Main Documentation Link */}
          {/* Similar styling to maintain visual consistency */}
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20"
            href="https://create.t3.gg/en/introduction"
            target="_blank"
          >
            <h3 className="text-2xl font-bold">Documentation →</h3>
            <div className="text-lg">
              Learn more about Create T3 App, the libraries it uses, and how to
              deploy it.
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
