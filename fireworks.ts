import { Particle, Firework } from './types';

export class FireworksSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private fireworks: Firework[] = [];
    private particles: Particle[] = [];
    private animationFrameId: number | null = null;
    private isRunning: boolean = false;

    private readonly COLORS = [
        '#ff0000', '#00ff00', '#0000ff',
        '#ffff00', '#ff00ff', '#00ffff',
        '#ff6600', '#9900ff', '#ff0099',
        '#66ff00', '#00ff66', '#ff9900'
    ];

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    private resize(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    public start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        this.fireworks = [];
        this.particles = [];
        this.animate();

        const launchFirework = () => {
            if (!this.isRunning) return;

            this.launch();
            setTimeout(launchFirework, Math.random() * 500 + 200);
        };

        launchFirework();

        setTimeout(() => this.stop(), 5000);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    private launch(): void {
        const firework: Firework = {
            x: Math.random() * this.canvas.width,
            y: this.canvas.height,
            targetY: Math.random() * (this.canvas.height * 0.5) + 50,
            vx: (Math.random() - 0.5) * 4,
            vy: -12 - Math.random() * 4,
            color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)],
            particles: [],
            exploded: false
        };

        this.fireworks.push(firework);
    }

    private animate = (): void => {
        if (!this.isRunning) return;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.updateFireworks();
        this.updateParticles();

        this.animationFrameId = requestAnimationFrame(this.animate);
    };

    private updateFireworks(): void {
        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            const fw = this.fireworks[i];
            
            fw.x += fw.vx;
            fw.y += fw.vy;
            fw.vy += 0.15;

            if (!fw.exploded && fw.vy >= -2) {
                this.explode(fw);
                this.fireworks.splice(i, 1);
            } else if (!fw.exploded) {
                this.drawFirework(fw);
            }
        }
    }

    private explode(firework: Firework): void {
        const particleCount = 80 + Math.floor(Math.random() * 40);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = Math.random() * 6 + 2;
            
            const particle: Particle = {
                x: firework.x,
                y: firework.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: firework.color,
                life: 1,
                maxLife: 1,
                size: Math.random() * 3 + 1
            };

            this.particles.push(particle);
        }

        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            
            const particle: Particle = {
                x: firework.x,
                y: firework.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: '#ffffff',
                life: 1,
                maxLife: 1,
                size: Math.random() * 2 + 0.5
            };

            this.particles.push(particle);
        }
    }

    private updateParticles(): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life -= 0.015;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            } else {
                this.drawParticle(p);
            }
        }
    }

    private drawFirework(firework: Firework): void {
        this.ctx.save();
        
        const gradient = this.ctx.createRadialGradient(
            firework.x, firework.y, 0,
            firework.x, firework.y, 15
        );
        
        gradient.addColorStop(0, firework.color);
        gradient.addColorStop(0.5, firework.color + '80');
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(firework.x, firework.y, 15, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(firework.x, firework.y, 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    private drawParticle(particle: Particle): void {
        this.ctx.save();
        
        const alpha = Math.floor(particle.life * 255).toString(16).padStart(2, '0');
        
        const gradient = this.ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 2
        );
        
        gradient.addColorStop(0, particle.color + alpha);
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }
}
