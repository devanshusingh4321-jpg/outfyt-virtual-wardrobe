import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState, useMemo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Download, Pause, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Creates a human-silhouette–shaped geometry (front/back halves of a cylinder
 * with slight tapering) so the textures wrap around like a real person.
 */
function HumanCylinder({
  frontUrl,
  backUrl,
  autoRotate,
}: {
  frontUrl: string;
  backUrl: string | null;
  autoRotate: boolean;
}) {
  const frontTex = useLoader(THREE.TextureLoader, frontUrl);
  const backTex = useLoader(THREE.TextureLoader, backUrl || frontUrl);
  const groupRef = useRef<THREE.Group>(null);

  // Calculate aspect from the front image
  const aspect = frontTex.image ? frontTex.image.width / frontTex.image.height : 3 / 4;
  const height = 4.2;
  const width = height * aspect;
  const depth = width * 0.35; // body depth

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  // Create a rounded box-like shape to simulate a body silhouette
  const bodyGeo = useMemo(() => {
    // Use a cylinder with elliptical cross-section
    const segments = 64;
    const geo = new THREE.CylinderGeometry(1, 1, height, segments, 1, true);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = pos.getY(i);

      // Elliptical scaling for body shape
      const normalizedY = (y + height / 2) / height; // 0 = bottom, 1 = top

      // Body width profile (shoulders wider, waist narrow, hips moderate)
      let widthScale: number;
      if (normalizedY > 0.85) {
        // Head/neck - narrow
        widthScale = 0.45;
      } else if (normalizedY > 0.7) {
        // Shoulders - widest
        widthScale = 1.0;
      } else if (normalizedY > 0.5) {
        // Chest to waist - tapering
        widthScale = 1.0 - (0.7 - normalizedY) * 0.5;
      } else if (normalizedY > 0.3) {
        // Hips
        widthScale = 0.85;
      } else {
        // Legs - narrower
        widthScale = 0.6;
      }

      pos.setX(i, x * (width / 2) * widthScale);
      pos.setZ(i, z * (depth / 2) * widthScale);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [width, height, depth]);

  // Create front and back materials with proper UV mapping
  const frontMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: frontTex,
      side: THREE.FrontSide,
      roughness: 0.7,
      metalness: 0.0,
    });
    return mat;
  }, [frontTex]);

  const backMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: backTex,
      side: THREE.FrontSide,
      roughness: 0.7,
      metalness: 0.0,
    });
    return mat;
  }, [backTex]);

  // Build two half-cylinder planes for front and back
  const frontGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, 32, 32);
    const pos = geo.attributes.position;
    // Curve the plane into a half-cylinder (front)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const normalizedX = x / (width / 2); // -1 to 1
      const normalizedY = (y + height / 2) / height;

      // Body silhouette width
      let widthScale = 1.0;
      if (normalizedY > 0.88) widthScale = 0.5;
      else if (normalizedY > 0.75) widthScale = 0.95;
      else if (normalizedY > 0.5) widthScale = 1.0 - (0.75 - normalizedY) * 0.3;
      else if (normalizedY > 0.3) widthScale = 0.85;
      else widthScale = 0.65;

      const angle = (normalizedX * Math.PI) / 2; // -π/2 to π/2
      const r = (depth / 2) * widthScale;
      pos.setX(i, Math.sin(angle) * (width / 2) * widthScale);
      pos.setZ(i, Math.cos(angle) * r);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [width, height, depth]);

  const backGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, 32, 32);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    // Curve into back half-cylinder
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const normalizedX = x / (width / 2);
      const normalizedY = (y + height / 2) / height;

      let widthScale = 1.0;
      if (normalizedY > 0.88) widthScale = 0.5;
      else if (normalizedY > 0.75) widthScale = 0.95;
      else if (normalizedY > 0.5) widthScale = 1.0 - (0.75 - normalizedY) * 0.3;
      else if (normalizedY > 0.3) widthScale = 0.85;
      else widthScale = 0.65;

      const angle = Math.PI + (normalizedX * Math.PI) / 2;
      const r = (depth / 2) * widthScale;
      pos.setX(i, Math.sin(angle) * (width / 2) * widthScale);
      pos.setZ(i, Math.cos(angle) * r);

      // Flip UVs horizontally for back
      uv.setX(i, 1 - uv.getX(i));
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [width, height, depth]);

  return (
    <group ref={groupRef}>
      <mesh geometry={frontGeo} material={frontMat} />
      <mesh geometry={backGeo} material={backMat} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <cylinderGeometry args={[0.8, 0.6, 3, 16]} />
      <meshStandardMaterial color="hsl(var(--muted))" opacity={0.5} transparent />
    </mesh>
  );
}

interface TryOn3DPreviewProps {
  imageUrl: string;
  backImageUrl?: string | null;
  outfitName: string;
}

export default function TryOn3DPreview({ imageUrl, backImageUrl, outfitName }: TryOn3DPreviewProps) {
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
      window.open(imageUrl, "_blank");
      toast({ title: "Opened in new tab for download" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden border border-border/30 bg-secondary/10" style={{ height: 480 }}>
        <Canvas
          shadows
          camera={{ position: [0, 0, 5.5], fov: 38 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={0.9} castShadow />
          <directionalLight position={[-3, 3, -3]} intensity={0.4} />
          <pointLight position={[0, -2, 3]} intensity={0.3} />
          <Suspense fallback={<LoadingFallback />}>
            <HumanCylinder
              frontUrl={imageUrl}
              backUrl={backImageUrl || null}
              autoRotate={autoRotate}
            />
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
            3D Model · Drag to rotate 360°
          </span>
        </div>

        {backImageUrl && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-display uppercase tracking-widest text-primary bg-primary/10 backdrop-blur-sm px-2 py-1 rounded-full border border-primary/30">
              Front + Back View
            </span>
          </div>
        )}
      </div>

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
