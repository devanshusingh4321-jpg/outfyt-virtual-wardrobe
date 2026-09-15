import { Link, useNavigate } from "react-router-dom";
import { Eye, LogOut, Menu, Ruler, Shirt, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type EditorialNavProps = {
  authenticated?: boolean;
  onSignOut?: () => void;
  backTo?: string;
  action?: React.ReactNode;
};

const EditorialNav = ({ authenticated = false, onSignOut, backTo, action }: EditorialNavProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = authenticated
    ? [
        { label: "Studio", to: "/dashboard" },
        { label: "Try-on", to: "/try-on", icon: Eye },
        { label: "Closet", to: "/closet", icon: Shirt },
        { label: "Fit profile", to: "/measurements", icon: Ruler },
      ]
    : [
        { label: "How it works", to: "/#how-it-works" },
        { label: "Sign in", to: "/auth" },
      ];

  return (
    <nav className="editorial-nav" aria-label="Primary navigation">
      <div className="container flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-4">
          {backTo && (
            <Button variant="ghost" size="sm" onClick={() => navigate(backTo)} aria-label="Go back">
              Back
            </Button>
          )}
          <Link to="/" className="wordmark" aria-label="Outfyt home">Outfyt</Link>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {links.map(({ label, to, icon: Icon }) => (
            <Button key={to} variant="ghost" size="sm" asChild>
              <Link to={to} className="gap-2">{Icon && <Icon aria-hidden="true" />}{label}</Link>
            </Button>
          ))}
          {authenticated && onSignOut && (
            <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Sign out"><LogOut /></Button>
          )}
          {action ?? (!authenticated && <Button size="sm" asChild><Link to="/try-on">Try it on</Link></Button>)}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {action}
          <Button variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          <div className="container flex flex-col items-stretch gap-1 px-0">
            {links.map(({ label, to, icon: Icon }) => (
              <Button key={to} variant="ghost" className="justify-start" asChild onClick={() => setOpen(false)}>
                <Link to={to}>{Icon && <Icon aria-hidden="true" />}{label}</Link>
              </Button>
            ))}
            {!authenticated && <Button asChild><Link to="/try-on">Try it on</Link></Button>}
            {authenticated && onSignOut && <Button variant="outline" onClick={onSignOut}><LogOut />Sign out</Button>}
          </div>
        </div>
      )}
    </nav>
  );
};

export default EditorialNav;