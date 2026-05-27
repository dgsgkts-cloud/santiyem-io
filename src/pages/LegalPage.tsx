import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import Footer from "@/components/Footer";

interface Section {
  title: string;
  content: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  sections: Section[];
}

const LegalPage = ({ title, sections }: LegalPageProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">{title}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-8 md:pb-10 lg:pb-12">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-xs text-muted-foreground mb-8">Son güncelleme: 01 Ocak 2025</p>
          <div className="space-y-8">
            {sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-sm font-bold mb-3 text-foreground">{i + 1}. {section.title}</h2>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{section.content}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;
