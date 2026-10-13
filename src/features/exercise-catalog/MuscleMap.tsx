import { useId } from 'react';
import type { Taxonomies } from '../../api/catalog';

type Region = { code: string; paths: string[] };
const front: Region[] = [
  {
    code: 'PECTORAL',
    paths: [
      'M65 76 Q72 70 82 78 L82 101 Q68 108 61 95 Z',
      'M88 78 Q98 70 105 76 L109 95 Q102 108 88 101 Z',
    ],
  },
  {
    code: 'DELTOIDES_ANTERIOR',
    paths: [
      'M62 69 Q54 70 49 84 L52 97 L63 90 L68 76 Z',
      'M108 69 Q116 70 121 84 L118 97 L107 90 L102 76 Z',
    ],
  },
  {
    code: 'DELTOIDES_LATERAL',
    paths: [
      'M52 75 Q46 81 45 94 L49 101 L52 91 Z',
      'M118 75 Q124 81 125 94 L121 101 L118 91 Z',
    ],
  },
  {
    code: 'BICEPS',
    paths: [
      'M49 101 L57 97 Q55 118 47 134 L40 130 Q42 112 49 101 Z',
      'M121 101 L113 97 Q115 118 123 134 L130 130 Q128 112 121 101 Z',
    ],
  },
  {
    code: 'ANTEBRAZO',
    paths: [
      'M40 139 L46 141 Q39 166 34 185 L28 183 Q30 155 40 139 Z',
      'M130 139 L124 141 Q131 166 136 185 L142 183 Q140 155 130 139 Z',
    ],
  },
  {
    code: 'ABDOMINALES',
    paths: [
      'M76 109 L83 110 L83 125 L75 124 Z',
      'M87 110 L94 109 L95 124 L87 125 Z',
      'M75 128 L83 129 L83 144 L76 143 Z',
      'M87 129 L95 128 L94 143 L87 144 Z',
      'M76 147 L83 148 L83 168 L78 165 Z',
      'M87 148 L94 147 L92 165 L87 168 Z',
    ],
  },
  {
    code: 'OBLICUOS',
    paths: [
      'M62 108 L71 112 L72 162 L65 170 Q62 139 62 108 Z',
      'M108 108 L99 112 L98 162 L105 170 Q108 139 108 108 Z',
    ],
  },
  {
    code: 'CUADRICEPS',
    paths: [
      'M60 198 L72 201 Q73 232 69 267 L60 271 Q55 236 60 198 Z',
      'M110 198 L98 201 Q97 232 101 267 L110 271 Q115 236 110 198 Z',
    ],
  },
  {
    code: 'ADUCTORES',
    paths: [
      'M76 202 L83 214 L77 258 L73 247 Z',
      'M94 202 L87 214 L93 258 L97 247 Z',
    ],
  },
];
const back: Region[] = [
  {
    code: 'TRAPECIO',
    paths: [
      'M77 63 L83 66 L83 127 L67 104 L64 78 Z',
      'M93 63 L87 66 L87 127 L103 104 L106 78 Z',
    ],
  },
  {
    code: 'DELTOIDES_POSTERIOR',
    paths: [
      'M62 70 Q51 70 48 89 L54 98 L65 90 L69 79 Z',
      'M108 70 Q119 70 122 89 L116 98 L105 90 L101 79 Z',
    ],
  },
  {
    code: 'DELTOIDES_LATERAL',
    paths: [
      'M50 75 Q45 81 44 93 L48 101 L51 91 Z',
      'M120 75 Q125 81 126 93 L122 101 L119 91 Z',
    ],
  },
  {
    code: 'TRICEPS',
    paths: [
      'M50 100 L57 98 Q54 119 46 135 L39 130 Q42 109 50 100 Z',
      'M120 100 L113 98 Q116 119 124 135 L131 130 Q128 109 120 100 Z',
    ],
  },
  {
    code: 'ANTEBRAZO',
    paths: [
      'M39 139 L46 143 L34 185 L28 183 Q30 155 39 139 Z',
      'M131 139 L124 143 L136 185 L142 183 Q140 155 131 139 Z',
    ],
  },
  {
    code: 'DORSAL',
    paths: [
      'M62 105 L80 131 L77 164 L66 158 Q61 134 62 105 Z',
      'M108 105 L90 131 L93 164 L104 158 Q109 134 108 105 Z',
    ],
  },
  {
    code: 'ERECTORES_LUMBARES',
    paths: [
      'M80 135 L84 138 L84 179 L78 175 Z',
      'M90 135 L86 138 L86 179 L92 175 Z',
    ],
  },
  {
    code: 'GLUTEO',
    paths: [
      'M65 173 L82 184 L82 207 Q68 220 59 204 L61 185 Z',
      'M105 173 L88 184 L88 207 Q102 220 111 204 L109 185 Z',
    ],
  },
  {
    code: 'ISQUIOTIBIALES',
    paths: [
      'M59 218 Q68 224 79 216 L75 257 L69 273 L60 272 Z',
      'M111 218 Q102 224 91 216 L95 257 L101 273 L110 272 Z',
    ],
  },
  {
    code: 'GEMELOS',
    paths: [
      'M61 287 L74 286 Q80 306 71 328 L67 347 L62 341 Q57 311 61 287 Z',
      'M109 287 L96 286 Q90 306 99 328 L103 347 L108 341 Q113 311 109 287 Z',
    ],
  },
];
const represented = new Set([...front, ...back].map((region) => region.code));
const silhouette =
  'M76 53 L76 63 Q64 64 54 69 Q44 76 41 98 L30 138 L23 181 L20 194 Q19 203 25 207 L30 199 L34 203 L40 182 L49 147 L59 113 L64 106 Q59 140 62 167 L57 195 Q51 236 56 274 L57 292 L58 350 L54 372 Q51 381 58 382 L75 380 L79 359 L81 305 L80 278 L84 235 L85 216 L86 235 L90 278 L89 305 L91 359 L95 380 L112 382 Q119 381 116 372 L112 350 L113 292 L114 274 Q119 236 113 195 L108 167 Q111 140 106 106 L111 113 L121 147 L130 182 L136 203 L140 199 L145 207 Q151 203 150 194 L147 181 L140 138 L129 98 Q126 76 116 69 Q106 64 94 63 L94 53 Z';

export function MuscleMap({
  primary,
  secondary,
  muscles,
  compact = false,
}: {
  primary: string[];
  secondary: string[];
  muscles: Taxonomies['muscles'];
  compact?: boolean;
}) {
  const id = useId();
  const name = (code: string) =>
    muscles.find((muscle) => muscle.code === code)?.name ?? code;
  const missing = [...new Set([...primary, ...secondary])].filter(
    (code) => !represented.has(code),
  );
  return (
    <figure className="rounded-xl bg-[#f4f3ed] p-3">
      {!compact && (
        <h3 className="text-sm font-semibold">Músculos participantes</h3>
      )}
      <svg
        viewBox="0 0 360 422"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        className={`mx-auto w-full ${compact ? 'max-h-48' : 'max-h-64'}`}
      >
        <title id={`${id}-title`}>
          Mapa muscular: vista anterior y posterior
        </title>
        <desc id={`${id}-description`}>
          {`Primarios: ${primary.map(name).join(', ') || 'sin especificar'}. Secundarios: ${secondary.map(name).join(', ') || 'sin participación indicada'}.`}
        </desc>
        <defs>
          <pattern
            id={`${id}-secondary`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <rect width="6" height="6" fill="#edbf70" />
            <path d="M0 0 V6" stroke="#96611d" strokeWidth="2" />
          </pattern>
        </defs>
        {[front, back].map((regions, view) => (
          <g
            key={view}
            transform={`translate(${view * 180 + 5} 5)`}
            aria-hidden="true"
          >
            <ellipse
              cx="85"
              cy="32"
              rx="15"
              ry="20"
              fill="#e0ded4"
              stroke="#a9a697"
            />
            <path
              d={silhouette}
              fill="#e0ded4"
              stroke="#a9a697"
              strokeWidth="1.2"
            />
            {regions.map((region) => {
              const participation = primary.includes(region.code)
                ? 'primary'
                : secondary.includes(region.code)
                  ? 'secondary'
                  : 'inactive';
              return (
                <g
                  key={region.code}
                  data-muscle={region.code}
                  data-participation={participation}
                >
                  <title>{name(region.code)}</title>
                  {region.paths.map((path, index) => (
                    <path
                      key={index}
                      d={path}
                      fill={
                        participation === 'primary'
                          ? '#b74736'
                          : participation === 'secondary'
                            ? `url(#${id}-secondary)`
                            : '#cbc8bc'
                      }
                      stroke={
                        participation === 'primary'
                          ? '#813327'
                          : participation === 'secondary'
                            ? '#96611d'
                            : '#aaa697'
                      }
                      strokeWidth="0.9"
                    />
                  ))}
                </g>
              );
            })}
            <text
              x="85"
              y="407"
              textAnchor="middle"
              fill="#57554b"
              fontSize="12"
            >
              {view === 0 ? 'Anterior' : 'Posterior'}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[#57554b]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#b74736]" />
          Primarios
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-[#96611d] bg-[repeating-linear-gradient(125deg,#edbf70_0px,#edbf70_3px,#96611d_3px,#96611d_4px)]" />
          Secundarios (rayados)
        </span>
      </figcaption>
      {!compact && (
        <p className="mt-2 text-center text-xs text-[#706e65]">
          Esquema por grupos musculares. No representa la técnica ni la
          intensidad del ejercicio.
        </p>
      )}
      {missing.length > 0 && !compact && (
        <p className="mt-2 text-xs">
          Sin representación gráfica: {missing.map(name).join(', ')}.
        </p>
      )}
    </figure>
  );
}
