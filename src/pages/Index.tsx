import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Database, Zap, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/login");
      }
      setLoading(false);
    });

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cerrar sesión",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary to-secondary">
        <div className="text-primary-foreground text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-secondary p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-6xl font-bold text-primary-foreground mb-4">
              Sistema de Dashboards
            </h1>
            <p className="text-xl text-primary-foreground/80">
              Gestiona datasets y crea visualizaciones personalizadas
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="bg-background/10 text-primary-foreground border-primary-foreground/20">
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-elegant hover:shadow-2xl transition-shadow cursor-pointer" onClick={() => navigate("/datasets")}>
            <CardHeader>
              <Database className="h-12 w-12 mb-4 text-primary" />
              <CardTitle className="text-2xl">Datasets Completos</CardTitle>
              <CardDescription>
                Gestiona datasets con versionamiento completo, genera dashboards por facultad y carrera, y crea links compartibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Ir a Datasets
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-elegant hover:shadow-2xl transition-shadow cursor-pointer" onClick={() => navigate("/quick-dashboard")}>
            <CardHeader>
              <Zap className="h-12 w-12 mb-4 text-accent" />
              <CardTitle className="text-2xl">Dashboard Rápido</CardTitle>
              <CardDescription>
                Carga un archivo y crea visualizaciones al instante sin guardar en base de datos. Ideal para análisis rápidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">
                Crear Dashboard Rápido
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
