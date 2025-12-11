import React, {type FormEvent} from 'react';
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2image";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

const Upload = () => {
    const[isProcessing, setIsProcessing] = React.useState(false);
    const[statusText, setStatusText] = React.useState("");
    const[file, setFile] = React.useState<File | null>(null);
    const {auth, fs, isLoading, ai, kv} = usePuterStore();
    const navigate = useNavigate();

    const handleFileSelect = (file: File | null) => {
        setFile(file);
    }

    const handleAnalyze =  async ({companyName, jobTitle, jobDescription, file}:{companyName : string, jobTitle : string, jobDescription: string, file : File}) => {
        setIsProcessing(true);
        setStatusText("Uploading file...");
        const uploadedFile = await fs.upload([file]);

        if(!uploadedFile){
            return setStatusText("Upload failed...");
        }

        setStatusText("Converting to image...");

        const imageFile = await convertPdfToImage(file);

        if(!imageFile.file){
            console.log(imageFile.error);
            return setStatusText("Error: Failed to convert PDF file to image...");
        }

        setStatusText("Uploading image...");

        const uploadedImage = await fs.upload([imageFile.file]);

        console.log(uploadedImage);

        if(!uploadedImage){
            return setStatusText("Error: Failed to upload image...");
        }

        setStatusText("Preparing the data....");

        const uuid = generateUUID();
        const data = {
            id: uuid,
            resumePath: uploadedFile,
            imagePath: uploadedImage,
            companyName,
            jobTitle,
            jobDescription,
            feedback: '',
        };

        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        setStatusText("Analyzing data...");

        const feedback = await ai.feedback(uploadedFile.path, prepareInstructions({jobTitle, jobDescription}));

        if(!feedback){
            return setStatusText("Error: Failed to analyze resume...");
        }

        const feedbackText = typeof feedback.message.content === "string" ? feedback.message.content : feedback.message.content[0].text;

        data.feedback = JSON.parse(feedbackText);
        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        setStatusText("Analysis completed, redirecting...");
        console.log(data);

        navigate(`/resume/${uuid}`);
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest("form");
        if(!form) return;

        const formData = new FormData(form);

        const companyName = formData.get("company_name") as string;
        const jobTitle = formData.get("job_title") as string;
        const jobDescription = formData.get("job_description") as string;

        console.log({companyName, jobTitle, jobDescription, file});

        if(!file) return;

        handleAnalyze({companyName, jobTitle, jobDescription, file});

    }
    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">

            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart Feedback For Your Dream Job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full"/>
                        </>
                    ): (
                        <>
                        <h2>Drop yout resume foe an ATS score and Improvement tips</h2></>
                    )}
                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className='form-div'>
                                <label htmlFor="company-name"> Company Name</label>
                                <input type="text" id="company-name" name="company_name" placeholder="Company Name" />
                            </div>
                            <div className='form-div'>
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" id="job-title" name="job_title" placeholder="Job Title" />
                            </div>
                            <div className='form-div'>
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} id="job-description" name="job_description" placeholder="Job Description" />
                            </div>
                            <div className='form-div'>
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>
                            <button type="submit" className="primary-button">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Upload;