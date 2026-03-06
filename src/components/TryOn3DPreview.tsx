import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw, Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function ImagePanel({ imageUrl, autoRotate }: { imageUrl: string; autoRotate: boolean }) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  const meshRef = useRef<THREE.Mesh>(null);

  // Calculate aspect ratio from image
  const aspect = texture.image ? texture.image.width / texture.image.height : 3 / 4;
  const height = 4;
  const width = height * aspect;

  useFrame((_, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} castShadow>
      <boxGeometry args={[width, height, 0.08]} />
      <meshStandardMaterial map={texture} attach="material-4" /> {/* front */}
      <meshStandardMaterial map={texture} attach="material-5" /> {/* back */}
      <meshStandardMaterial color="#1a1a2e" attach="material-0" />
      <meshStandardMaterial color="#1a1a2e" attach="material-1" />
      <meshStandardMaterial color="#1a1a2e" attach="material-2" />
      <meshStandardMaterial color="#1a1a2e" attach="material-3" />
    </mesh>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[2, 3, 0.08]} />
      <meshStandardMaterial color="#2a2a3e" />
    </mesh>
  );
}

interface TryOn3DPreviewProps {
  imageUrl: string;
  outfitName: string;
}

export default function TryOn3DPreview({ imageUrl, outfitName }: TryOn3DPreviewProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tryon-${outfitName.replace(/\s+/g, "-").toLowerCase()}-hd.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Image downloaded! 📥" });
    } catch {
      // Fallback: open in new tab
      window.open(imageUrl, "_blank");
      toast({ title: "Opened in new tab for download" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden border border-border/30 bg-secondary/10" style={{ height: 420 }}>
        <Canvas
          shadows
          camera={{ position: [0, 0, 6], fov: 40 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-3, 3, -3]} intensity={0.3} />
          <Suspense fallback={<LoadingFallback />}>
            <ImagePanel imageUrl={imageUrl} autoRotate={autoRotate} />
            <Environment preset="studio" />
          </Suspense>
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={3}
            maxDistance={10}
            autoRotate={false}
          />
        </Canvas>

        {/* Controls overlay */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50"
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? "Pause rotation" : "Resume rotation"}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground bg-background/60 backdrop-blur-sm px-2 py-1 rounded-full border border-border/30">
            3D Preview · Drag to rotate
          </span>
        </div>
      </div>

      {/* Download Button */}
      <Button
        onClick={handleDownload}
        variant="outline"
        className="w-full gap-2 font-display border-primary/30 hover:bg-primary/10"
      >
        <Download className="w-4 h-4" /> Download HD Image
      </Button>
    </div>
  );
}
