/*
  MOLI · COREOGRAFÍA (GSAP sobre el estado de Moli; no toca el 3D ni la página)

  Tres momentos:
  - reposo: sentada en «Soy maestra», respira, balancea las piernitas,
    parpadea y se ladea apenas;
  - saludo («Soy maestra»): sigue sentada, mira, levanta un hidrógeno y
    saluda;
  - salto («Soy alumno»): se para, toma envión, salta en arco, aterriza con
    un rebote elástico y saluda.
  Se estira y se aplasta poco (pedido de Sofia: "un poco, sin exagerar"):
  como mucho un 10 % al aterrizar, siempre desde los pies y sin cambiar el
  volumen.
*/
import gsap from 'gsap';
import type { EstadoMoli } from './moli';

const azar = (min: number, max: number) => min + Math.random() * (max - min);

/* Cuánto se estira o se aplasta en cada momento (1 = normal). */
export const ESTIRA = {
  enviones: 0.92, // se agacha antes de saltar
  despegue: 1.06, // se estira al despegar
  aterrizaje: 0.9, // se aplasta al tocar la placa
} as const;

/* Reposo. Devuelve cómo detenerlo. */
export function reposo(m: EstadoMoli) {
  let vivo = true;
  const animaciones: gsap.core.Animation[] = [
    // respira (el sistema de diseño: de 1 a 1,03 en 4–6 s)
    gsap.to(m, { respira: 1.025, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
    // se ladea apenas
    gsap.to(m, { inclina: 1.4, duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.8 }),
    // balancea las piernitas: una adelante y la otra atrás
    gsap
      .timeline({ repeat: -1, delay: 0.4 })
      .to(m, { vaiven: 9, duration: 0.8, ease: 'sine.inOut' })
      .to(m, { vaiven: -9, duration: 1.6, ease: 'sine.inOut' })
      .to(m, { vaiven: 0, duration: 0.8, ease: 'sine.inOut' })
      .to({}, { duration: azar(0.6, 1.4) }), // a veces descansa
  ];
  // parpadea cada tanto (a veces dos veces seguidas)
  let parpadeo: gsap.core.Timeline | null = null;
  const parpadear = () => {
    if (!vivo) return;
    parpadeo = gsap.timeline({ delay: azar(2.2, 5), onComplete: parpadear });
    parpadeo.to(m, { parpado: 0.1, duration: 0.07, ease: 'power1.in' }).to(m, { parpado: 1, duration: 0.12, ease: 'power1.out' });
    if (Math.random() < 0.25) parpadeo.to(m, { parpado: 0.1, duration: 0.07, delay: 0.08 }).to(m, { parpado: 1, duration: 0.12 });
  };
  parpadear();
  return () => {
    vivo = false;
    animaciones.forEach((a) => a.kill());
    parpadeo?.kill();
    gsap.to(m, { parpado: 1, duration: 0.1 });
  };
}

/* «Soy maestra»: sigue sentada, mira a quien la eligió y saluda. */
export function saludo(m: EstadoMoli) {
  return gsap
    .timeline()
    .to(m, { giro: 0, mirarX: 0, mirarY: 2, inclina: 0, vaiven: 0, piernas: 14, duration: 0.35, ease: 'power2.out' })
    .to(m, { manoDer: 84, manoAdelante: 26, duration: 0.42, ease: 'back.out(1.7)' }, 0.1)
    .to(m, { estira: 1.03, duration: 0.2, ease: 'sine.out', yoyo: true, repeat: 1 }, 0.12)
    .to(m, { ola: 14, duration: 0.16, ease: 'sine.out' }, 0.5)
    .to(m, { ola: -12, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 4 }, '>')
    .to(m, { ola: 0, duration: 0.15, ease: 'sine.out' }, '>');
}

export type Destino = {
  /** los pies en la placa de destino (píxeles del lienzo) */
  x: number;
  y: number;
  /** cuánto sube el arco, en píxeles */
  altura: number;
};

/*
  «Soy alumno»: de una placa a la otra, siempre a la vista.
  alDespegar / alLlegar: para que la página acompañe (sombras, la placa que
  responde).
*/
export function salto(m: EstadoMoli, destino: Destino, alDespegar: () => void, alLlegar: () => void) {
  const desde = { x: m.x, y: m.y };
  const arco = { t: 0 };
  const hacia = Math.sign(destino.x - desde.x) || 1; // +1: salta hacia la derecha
  const vuelo = 0.62;
  return (
    gsap
      .timeline()
      // 1 · se para: las piernitas bajan debajo del cuerpo y mira hacia donde va
      .to(m, { alto: 0, piernas: 0, vaiven: 0, giro: 18 * hacia, mirarX: 0, mirarY: 0, inclina: 0, manoIzq: 10, manoDer: 10, duration: 0.42, ease: 'power2.inOut' })
      // 2 · toma envión: se agacha apenas
      .to(m, { estira: ESTIRA.enviones, manoIzq: -6, manoDer: -6, duration: 0.2, ease: 'power2.out' })
      // 3 · despega y vuela en arco (el arco es un solo movimiento: x pareja, y en parábola)
      .addLabel('despegue')
      .call(alDespegar, [], 'despegue')
      .to(m, { estira: ESTIRA.despegue, duration: 0.13, ease: 'power2.out' }, 'despegue')
      .to(m, { estira: 1, duration: 0.35, ease: 'sine.inOut' }, 'despegue+=0.13')
      .to(m, { manoIzq: 48, manoDer: 48, piernas: -26, duration: 0.25, ease: 'power2.out' }, 'despegue')
      .to(m, { inclina: -9 * hacia, duration: 0.25, ease: 'power2.out' }, 'despegue')
      .to(m, { inclina: 4 * hacia, duration: 0.35, ease: 'sine.inOut' }, 'despegue+=0.25')
      .to(
        arco,
        {
          t: 1,
          duration: vuelo,
          ease: 'none',
          onUpdate: () => {
            const t = arco.t;
            m.x = desde.x + (destino.x - desde.x) * t;
            m.y = desde.y + (destino.y - desde.y) * t - destino.altura * 4 * t * (1 - t);
          },
        },
        'despegue',
      )
      // antes de tocar, las piernitas bajan
      .to(m, { piernas: 0, manoIzq: 22, manoDer: 22, duration: 0.2, ease: 'power1.inOut' }, `despegue+=${vuelo - 0.2}`)
      // 4 · aterriza con un rebote elástico
      .addLabel('aterrizaje', `despegue+=${vuelo}`)
      .call(alLlegar, [], 'aterrizaje')
      .to(m, { estira: ESTIRA.aterrizaje, inclina: 0, duration: 0.09, ease: 'power2.out' }, 'aterrizaje')
      .to(m, { estira: 1, duration: 0.75, ease: 'elastic.out(1, 0.45)' }, 'aterrizaje+=0.09')
      .to(m, { manoIzq: 0, manoDer: 0, giro: -6 * hacia, duration: 0.35, ease: 'power2.out' }, 'aterrizaje+=0.1')
      // 5 · saluda (con la mano del lado de donde vino)
      .to(m, { ...(hacia > 0 ? { manoIzq: 84 } : { manoDer: 84 }), manoAdelante: 26, duration: 0.4, ease: 'back.out(1.7)' }, 'aterrizaje+=0.35')
      .to(m, { ola: 14, duration: 0.16, ease: 'sine.out' }, 'aterrizaje+=0.65')
      .to(m, { ola: -12, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 2 }, '>')
  );
}
