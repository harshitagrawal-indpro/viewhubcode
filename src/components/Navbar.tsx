
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? "py-2 glass shadow-sm border-b border-white/20"
          : "py-4 bg-transparent"
      }`}
    >
      <div className="container px-4 mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center space-x-2"
        >
          <Logo showText={!isMobileMenuOpen} />
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link
            to="/"
            className="text-foreground/80 hover:text-foreground transition-colors font-medium"
          >
            Home
          </Link>
          <Link
            to="/features"
            className="text-foreground/80 hover:text-foreground transition-colors font-medium"
          >
            Features
          </Link>
          <Link
            to="/about"
            className="text-foreground/80 hover:text-foreground transition-colors font-medium"
          >
            About
          </Link>
          <Link
            to="/signin"
            className="rounded-full px-6 py-2 bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </nav>

        <button
          className="md:hidden text-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full glass shadow-lg border-b border-white/20 py-4">
          <div className="container px-4 mx-auto flex flex-col space-y-4">
            <Link
              to="/"
              className="text-foreground/80 hover:text-foreground transition-colors font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/features"
              className="text-foreground/80 hover:text-foreground transition-colors font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              to="/about"
              className="text-foreground/80 hover:text-foreground transition-colors font-medium py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/signin"
              className="rounded-full px-6 py-2 bg-primary text-white font-medium hover:bg-primary/90 transition-colors inline-block text-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
