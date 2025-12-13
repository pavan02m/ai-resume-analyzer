import React, {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from "react-router";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => ([
    {title : 'Resumlyzer | Review'},
    {name : 'description',  content:'Resume Analysis.'}
]);



const Resume = () => {
    const {id} = useParams();
    const {auth, isLoading, fs, kv} = usePuterStore();
    const [resumeUrl, setResumeUrl] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    },[isLoading, auth.isAuthenticated])

    const ProfileMenu: React.FC = () => {
        const [open, setOpen] = useState(false);
        const user = auth.user;
        const initials = user
            ? user.username
                .split(/\s+/)
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "U";

        const handleSignOut = async () => {
            try {
                await auth.signOut();
            } catch (err) {
                console.error("Sign out failed:", err);
            } finally {
                navigate("/"); // adjust redirect as needed
            }
        };

        return (
            <div className="relative">
                <button
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="true"
                    aria-expanded={open}
                    className="flex items-center gap-2 p-1 rounded-full hover:shadow-sm focus:outline-none"
                >
                    <div className="w-9 h-9 bg-pink-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-700">
                        {initials}
                    </div>
                </button>

                {open && (
                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg z-50">
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                            onClick={() => {
                                setOpen(false);
                                handleSignOut();
                            }}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        );
    };

    useEffect(() => {
        const loadResume = async () =>{
            const resume = await kv.get(`resume:${id}`);

            if(!resume) return;

            const data = JSON.parse(resume);

            const resumeBlob = await fs.read(data.resumePath);
            if(!resumeBlob) return;

            const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
            const resumeUrl = URL.createObjectURL(pdfBlob);
            setResumeUrl(resumeUrl);

            console.log(data.imagePath);
            const imageBlob = await fs.read(data.imagePath);
            if(!imageBlob) return;
            const imageUrl = URL.createObjectURL(imageBlob);
            setImageUrl(imageUrl);

            setFeedback(data.feedback);
            console.log({resumeUrl, imageUrl, feedback: data.feedback });
        }

        loadResume();
    }, [id])

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="Back" className="w-2.5 h-2.5"/>
                    <span className="text-grey-800 text-sm font-semibold">Back to Home Page</span>
                </Link>
                <div className="flex items-center gap-3">
                    <ProfileMenu />
                </div>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-w-xl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank">
                                <img src={imageUrl} title="resumeImg" className="w-full h-full object-contain rounded-2xl"/>
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                        <h2 className="text-4xl !text-black font-bold">
                            Review section
                        </h2>
                    {feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []}/>
                            <Details feedback={feedback} />
                        </div>
                    ) : (
                        <img src="/images/resume-scan-2.gif" alt="resume"/>
                        )}
                </section>
            </div>
        </main>
    );
};

export default Resume;