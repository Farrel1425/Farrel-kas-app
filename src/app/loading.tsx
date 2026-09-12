import { LoaderCircle } from "lucide-react";
export default function Loading() {
  return (
    <div className="center-page" role="status">
      <LoaderCircle className="spin blue" size={32} />
      <p>Menyiapkan buku kas Anda…</p>
    </div>
  );
}
