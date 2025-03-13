import { networkScan } from "@/actions/probes/nmap";

export default async function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      <form>
        <input type="text" name="ipRange" placeholder="IP Range" />
        <input
          type="text"
          name="outputFilename"
          placeholder="Output Filename"
        />
        <button
          type="submit"
          formAction={async (formData: FormData) => {
            "use server";
            const ipRange = formData.get("ipRange");
            const outputFilename = formData.get("outputFilename");
            if (
              typeof ipRange !== "string" ||
              typeof outputFilename !== "string"
            )
              return;
            await networkScan(ipRange, outputFilename);
          }}
        >
          Network Scan
        </button>
      </form>
    </div>
  );
}
