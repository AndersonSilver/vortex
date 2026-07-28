import { useRef, useState } from "react";
import { Modal } from "./Modal";
import { useCreateQuote } from "../hooks/useQuotes";
import { useToast } from "./Toast";

const MATERIALS = ["PLA", "PETG", "ABS", "Resina", "Nylon", "TPU"];

export function CustomQuoteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [color, setColor] = useState("Branco");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const createQuote = useCreateQuote();
  const { showToast } = useToast();

  function reset() {
    setFile(null);
    setMaterial(MATERIALS[0]);
    setColor("Branco");
    setQty(1);
    setNotes("");
    setEmail("");
  }

  function handleSubmit() {
    if (!file) {
      showToast("Selecione um arquivo STL, OBJ ou 3MF.", "error");
      return;
    }
    if (!email) {
      showToast("Informe seu e-mail para retorno.", "error");
      return;
    }
    createQuote.mutate(
      { file, material, color, qty, notes: notes || undefined, email },
      {
        onSuccess: () => {
          onClose();
          reset();
          showToast("Solicitação enviada! Retornaremos em até 1h ✉️", "success");
        },
        onError: () => showToast("Não foi possível enviar sua solicitação.", "error"),
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="🧩 Orçamento Personalizado">
      <p style={{ color: "var(--text-muted)", fontSize: ".88rem", marginBottom: "1.5rem" }}>
        Envie seu arquivo e receba um orçamento em até 1 hora.
      </p>
      <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
        <div className="upload-icon">📁</div>
        <div className="upload-text">
          {file ? file.name : "Clique para selecionar ou arraste aqui"}
          <br />
          <small>STL, OBJ, 3MF — máx. 50MB</small>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl,.obj,.3mf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="form-group" style={{ marginTop: "1rem" }}>
        <label>Material desejado</label>
        <select className="admin-select" value={material} onChange={(e) => setMaterial(e.target.value)}>
          {MATERIALS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Cor</label>
          <input className="admin-input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Branco" />
        </div>
        <div className="form-group">
          <label>Quantidade</label>
          <input
            className="admin-input"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          />
        </div>
      </div>
      <div className="form-group">
        <label>Observações</label>
        <textarea
          className="admin-textarea"
          placeholder="Acabamento, escala, urgência..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>E-mail para retorno</label>
        <input
          className="admin-input"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button className="btn-primary" style={{ width: "100%", marginTop: ".5rem" }} onClick={handleSubmit} disabled={createQuote.isPending}>
        Enviar Solicitação
      </button>
    </Modal>
  );
}
