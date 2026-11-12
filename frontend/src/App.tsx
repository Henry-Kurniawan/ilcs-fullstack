import { Route, Routes } from "react-router";
import { KatalogPage } from "./KatalogPage.tsx";
import { LaguDetailPage } from "./LaguDetailPage.tsx";
import { Layout } from "./Layout.tsx";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<KatalogPage />} />
        <Route path="/lagu/:id" element={<LaguDetailPage />} />
      </Route>
    </Routes>
  );
}
