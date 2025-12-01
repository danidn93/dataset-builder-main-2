
import { Toaster } from "@/components/ui/sonner";  // ← el tuyo

//import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import QuickDashboard from "./pages/QuickDashboard";
import Datasets from "./pages/Datasets";
import CreateDataset from "./pages/CreateDataset";
import DatasetVersions from "./pages/DatasetVersions";
import CreateVersion from "./pages/CreateVersion";
import Dashboard from "./pages/Dashboard";
import ShareLinks from "./pages/ShareLinks";
import PublicDashboard from "./pages/PublicDashboard";
import NotFound from "./pages/NotFound";

import PublicStaticDashboard from "./pages/PublicStaticDashboard";
import PublicFullDashboard from "./pages/PublicFullDashboard";
import TableAnalysis from "./pages/dataset-versions/TablesAnalysis";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>


      {/* ⭐ TU SONNER PERSONALIZADO ⭐ */}
      <Toaster richColors position="top-right" />


      <Toaster />
      <Sonner />

      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Index />} />
          <Route path="/quick-dashboard" element={<QuickDashboard />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/datasets/create" element={<CreateDataset />} />
          <Route path="/datasets/:datasetId/versions" element={<DatasetVersions />} />
          <Route path="/datasets/:datasetId/versions/create" element={<CreateVersion />} />
          <Route path="/datasets/:datasetId/versions/:versionId/dashboard" element={<Dashboard />} />
          <Route path="/datasets/:datasetId/versions/:versionId/share-links" element={<ShareLinks />} />
          <Route path="/public/:token" element={<PublicDashboard />} />

          <Route path="/public-static/:token" element={<PublicStaticDashboard />} />  
          <Route path="/public-dashboard/:token" element={<PublicFullDashboard />} />
          <Route path="/datasets/:datasetId/versions/:versionId/tables" element={<TableAnalysis />} />  

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
