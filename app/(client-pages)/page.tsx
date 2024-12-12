import BestSellers from "@/components/client/BestSellers";
import Hero from "@/components/client/Hero";
import Populars from "@/components/client/Populars";

export default function Home() {
  return (
    <div>
      <Hero />
      <BestSellers />
      <Populars />
    </div>
  );
}
