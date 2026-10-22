// 배포 위치(/ 또는 /저장소이름/)와 상관없이 링크가 맞도록 앞에 기준 경로를 붙인다.
export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export const href = (path = '') => `${base}${path.replace(/^\//, '')}`;
