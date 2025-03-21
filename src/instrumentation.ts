import { nmapJob } from "@/actions/jobs/nmap.job";

// Use the instrumentation.ts file to start jobs when the server starts
nmapJob.start();
