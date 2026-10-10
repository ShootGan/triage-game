import * as THREE from 'three';

export const NEAR = 0.1;
export const FAR = 80;

export interface PixelPipelineOptions {
  /**
   * Wewnętrzna szerokość renderu w px (wysokość wynika z proporcji canvasa). Domyślnie 640.
   * Na canvasie pionowym stała jest wysokość: width·9/16 (domyślnie 360).
   */
  width?: number;
  /** Kontur z bufora głębokości (domyślnie wyłączony). */
  outline?: boolean;
}

/**
 * Render do niskiej rozdzielczości (640×H) z teksturą głębi, potem pełnoekranowy
 * przebieg post-process (opcjonalny kontur) i skalowanie „nearest" przez CSS.
 */
export class PixelPipeline {
  readonly renderer: THREE.WebGLRenderer;
  private rt: THREE.WebGLRenderTarget | null = null;
  private readonly post: THREE.ShaderMaterial;
  private readonly postScene = new THREE.Scene();
  private readonly postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly postGeo = new THREE.PlaneGeometry(2, 2);
  private readonly ro: ResizeObserver;
  private readonly baseWidth: number;
  /** Wewnętrzna rozdzielczość. */
  width = 0;
  height = 0;
  /** Wołane po zmianie rozdzielczości (np. aktualizacja proporcji kamery). */
  onResize: (() => void) | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, opts: PixelPipelineOptions = {}) {
    this.baseWidth = opts.width ?? 640;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false });
    r.setPixelRatio(1);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = r;

    // Canvas wypełnia rodzica; piksele skalowane bez wygładzania
    const st = canvas.style;
    st.display = 'block';
    st.width = '100%';
    st.height = '100%';
    st.imageRendering = 'pixelated';
    st.touchAction = 'none';

    // Post-process: kontur z głębokości. r186: ShaderMaterial nadal dostaje #define texture2D/gl_FragColor,
    // a <colorspace_fragment> konwertuje liniowy RT do sRGB przy renderze na ekran (jak w r160).
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        res: { value: new THREE.Vector2() },
        outline: { value: opts.outline ? 1 : 0 },
        thr: { value: 0.3 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tDiffuse, tDepth; uniform vec2 res; uniform float outline, thr; varying vec2 vUv;
        float D(vec2 o){ return texture2D(tDepth, vUv + o / res).r * ${(FAR - NEAR).toFixed(1)}; }
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          if (outline > 0.5) {
            float d = D(vec2(0.0));
            float e = max(0.0, d - D(vec2(1.0,0.0))) + max(0.0, d - D(vec2(-1.0,0.0)))
                    + max(0.0, d - D(vec2(0.0,1.0))) + max(0.0, d - D(vec2(0.0,-1.0)));
            if (e > thr) c.rgb = mix(c.rgb, vec3(0.07, 0.06, 0.1), 0.7);
          }
          gl_FragColor = c;
          #include <colorspace_fragment>
        }`,
      depthTest: false,
      depthWrite: false,
    });
    this.postScene.add(new THREE.Mesh(this.postGeo, this.post));

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
  }

  get aspect(): number {
    return this.width / this.height;
  }

  setOutline(on: boolean): void {
    this.post.uniforms.outline.value = on ? 1 : 0;
  }

  /** Próg konturu zależny od zoomu kamery (jak w prototypie). */
  setOutlineZoom(zoom: number): void {
    this.post.uniforms.thr.value = 0.12 + zoom * 0.05;
  }

  /**
   * Dopasowanie wewnętrznej rozdzielczości do proporcji canvasa. Poziomo: szerokość stała (640).
   * Pionowo (telefon): stała wysokość 640·9/16 = 360, szerokość z proporcji — inaczej render miałby
   * 640×1400 px i piksele mniejsze niż piksele ekranu (rozmyty, kosztowny obraz bez efektu pixel-art).
   */
  resize(): void {
    const cw = this.canvas.clientWidth || 16;
    const ch = this.canvas.clientHeight || 9;
    let w = this.baseWidth;
    let h = Math.max(1, Math.round((w * ch) / cw));
    if (ch > cw) {
      h = Math.round((this.baseWidth * 9) / 16);
      w = Math.max(1, Math.round((h * cw) / ch));
    }
    if (w === this.width && h === this.height && this.rt) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.rt?.depthTexture?.dispose();
    this.rt?.dispose();
    const rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    rt.depthTexture = new THREE.DepthTexture(w, h);
    this.rt = rt;
    this.post.uniforms.tDiffuse.value = rt.texture;
    this.post.uniforms.tDepth.value = rt.depthTexture;
    (this.post.uniforms.res.value as THREE.Vector2).set(w, h);
    this.onResize?.();
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }

  dispose(): void {
    this.ro.disconnect();
    this.renderer.setAnimationLoop(null);
    this.rt?.depthTexture?.dispose();
    this.rt?.dispose();
    this.rt = null;
    this.post.dispose();
    this.postGeo.dispose();
    this.renderer.dispose();
  }
}
