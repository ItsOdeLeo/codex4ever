/** Browser bridge: the capability never enters storage or an external URL. */
export function pluginPageClient(location=globalThis.location,fetcher=globalThis.fetch) {
  const token=new URLSearchParams(location?.hash?.slice(1)??'').get('planner');
  if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
  const request=async(path,method='GET',preferences)=>{
    const response=await fetcher(path,{method,headers:{Authorization:`Bearer ${token}`,
      ...(preferences ? {'Content-Type':'application/json'} : {})},
      ...(preferences ? {body:JSON.stringify(preferences)} : {})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error??'Local planner is unavailable');
    return data;
  };
  return {read:revision=>request(`/api/session${Number.isInteger(revision) ? `?after=${revision}` : ''}`),
    refresh:preferences=>request('/api/refresh','POST',preferences)};
}
