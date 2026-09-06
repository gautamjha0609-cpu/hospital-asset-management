import { ScanClient } from "@/components/ScanClient";

export const dynamic = "force-dynamic";

export default function ScanPage() {
  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Scan an asset</h1>
        <p className="text-sm text-gray-500">
          Point the camera at any asset's QR code, or type its tag / serial /
          barcode in the box below.
        </p>
      </div>
      <ScanClient />
    </div>
  );
}
