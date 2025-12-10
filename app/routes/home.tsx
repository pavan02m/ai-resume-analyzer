import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import {resumes} from "../../constants";
import ResumeCard from "~/components/ResumeCard";
import {usePuterStore} from "~/lib/puter";
import {useLocation, useNavigate} from "react-router";
import {useEffect} from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resume Analyzer" },
    { name: "description", content: "Personalised feedback to your resume" },
  ];
}

export default function Home() {

    const {auth} = usePuterStore();
    const navigate = useNavigate();

    useEffect(() => {
        console.log("Home page");
        console.log(auth.isAuthenticated);
        if(!auth.isAuthenticated) navigate('/auth?next=/');
    },[auth.isAuthenticated])

  return <main className="bg-[url('/images/bg-main.svg')] bg-cover">

      <Navbar />

    <section className="main-section">
        <div className="page-heading py-16">
            <h1>Track Your Applications and Resume Ratings.</h1>
            <h2>Review your submission & check AI powered feedback</h2>
        </div>

        {resumes.length > 0 && (
            <div className="resumes-section">
                {resumes.map((resume, index) => (
                    <div>
                        <ResumeCard key={resume.id} resume={resume}/>
                    </div>
                ))}
            </div>
        )}
    </section>

  </main>;
}
