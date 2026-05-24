import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { Navigation } from "@/components/Navigation";

export default function ModuleNotFound() {
  return (
    <div className="min-h-screen bg-gradient-dark">
      <Navigation />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 pt-24">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 cyber-border rounded-2xl bg-primary/10">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="mb-4 text-6xl font-bold text-gradient">404</h1>
          <h2 className="mb-4 text-2xl font-bold text-foreground">Module Not Found</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            That training module does not exist. Choose an active operation from the modules list.
          </p>
          <Button size="lg" className="gradient-primary font-semibold" asChild>
            <Link href="/modules">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Modules
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
