import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, CalendarDays, MessageCircle } from 'lucide-react';

export default function PublicLanding() {
  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Camera className="w-4 h-4 text-accent" />
          </div>
          <span className="font-heading font-semibold text-foreground">LensFlow</span>
        </div>
        <Link
          to="/admin/login"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Photographer sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <Camera className="w-8 h-8 text-accent" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground max-w-xl leading-tight">
          Beautiful photography, made simple.
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-md">
          Book a session, get your gallery, and cherish your memories — all in one place.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/booking-request"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Book a session
          </Link>
          <Link
            to="/book"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-accent/5 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Talk to our booking assistant
          </Link>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border">
        &copy; {new Date().getFullYear()} LensFlow. All rights reserved.
      </footer>
    </div>
  );
}
