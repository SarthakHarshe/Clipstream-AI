// nav-header.tsx
// --------------
// Navigation header component for Clipstream AI dashboard. Displays the app logo,
// user credits, and a dropdown menu with user account options and sign out functionality.

"use client";

import Link from "next/link";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { signOut } from "next-auth/react";

// Main navigation header component
const NavHeader = ({ credits, email }: { credits: number; email: string }) => {
  return (
    <header className="bg-background sticky top-0 z-10 flex justify-center border-b">
      <div className="container flex h-16 items-center justify-between px-4 py-2">
        {/* App logo and branding */}
        <Link href="/dashboard" className="flex items-center">
          <div className="font-sans text-xl font-medium tracking-tight">
            <span className="text-foreground">Clipstream</span>
            <span className="text-foreground font-light">AI</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {/* Credits display and purchase button */}
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="h-8 px-3 py-1.5 text-xs font-medium"
            >
              {credits} credits
            </Badge>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs font-medium"
            >
              <Link href="/dashboard/Billing">Buy more</Link>
            </Button>
          </div>

          {/* User dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0"
              >
                <Avatar>
                  <AvatarFallback>{email.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* User email display */}
              <DropdownMenuLabel>
                <p className="text-muted-foreground text-xs">{email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* Billing link */}
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing">Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Sign out option */}
              <DropdownMenuItem
                onClick={() => signOut({ redirectTo: "/login" })}
                className="text-destructive cursor-pointer"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default NavHeader;
