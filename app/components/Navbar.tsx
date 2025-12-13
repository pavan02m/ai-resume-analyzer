import React, {useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate} from "react-router";
import {usePuterStore} from "~/lib/puter";

const Navbar = () => {
    const { auth } = usePuterStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const isLoggedIn = Boolean(auth?.isAuthenticated);
    const user = auth?.user;

    const showUpload = location.pathname === "/";

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, []);

    const handleLogout = async () => {
        try {
            await auth.signOut();
        } finally {
            setOpen(false);
            navigate("/auth?next=/");
        }
    };

    const initials = user?.username
        ? user.username
            .split(/\s+/)
            .map((s) => s[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        : "U";

    return (
       <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
           <Link  to="/">
               <p className="text-2xl font-bold text-gredient">RESULYZE</p>
           </Link>
           {/*<Link to="/upload" className="primary-button w-fit">*/}
           {/*     Upload Resume*/}
           {/*</Link>*/}
           <div className="ml-auto flex items-center gap-4">
               {showUpload && (
                   <Link to="/upload" className="primary-button w-fit">
                       Upload Resume
                   </Link>
               )}

               {isLoggedIn ? (
                   <div className="relative" ref={dropdownRef}>
                       <button
                           type="button"
                           onClick={() => setOpen((s) => !s)}
                           aria-haspopup="true"
                           aria-expanded={open}
                           className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-medium focus:outline-none"
                           title="Account"
                       >
                           <span>{initials}</span>
                       </button>

                       {open && (
                           <div className="absolute right-0 mt-2 w-44 bg-white text-gray-900 rounded shadow-lg z-20">
                               <button
                                   onClick={handleLogout}
                                   className="w-full text-left px-4 py-2 hover:bg-gray-100"
                               >
                                   Logout
                               </button>
                           </div>
                       )}
                   </div>
               ) : null}
           </div>
       </nav>
    );
};

export default Navbar;