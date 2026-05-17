// Local-first cloud sync layer.
// - All reads/writes still hit localStorage (instant, offline-friendly).
// - When the user is signed in to a real account, we mirror changes to
//   /api/projects in the background. The Dashboard merges the cloud list
//   on load so projects show up across devices.
// - If /api/projects returns 503 (KV not configured) or 401 (no session),
//   we silently fall back to localStorage-only. Nothing breaks.

(function(){
  let _cloudOk = null; // null=unknown, true=working, false=disabled

  function isGuest(){
    const s = (window.readSession && window.readSession()) || null;
    return !s || s.guest || !s.login;
  }

  async function cloudAvailable(){
    if(_cloudOk !== null) return _cloudOk;
    try{
      const r = await fetch('/api/me', {credentials:'include'});
      _cloudOk = r.ok;
    }catch{ _cloudOk = false; }
    return _cloudOk;
  }

  async function listCloudProjects(){
    if(isGuest()) return [];
    try{
      const r = await fetch('/api/projects', {credentials:'include'});
      if(!r.ok) return [];
      const j = await r.json();
      return Array.isArray(j.projects) ? j.projects : [];
    }catch{ return []; }
  }

  async function fetchCloudProject(id){
    if(isGuest()) return null;
    try{
      const r = await fetch('/api/projects?id=' + encodeURIComponent(id), {credentials:'include'});
      if(!r.ok) return null;
      return await r.json();
    }catch{ return null; }
  }

  // Debounced background push of the current project.
  let _pushT = null;
  function schedulePush(){
    if(isGuest()) return;
    if(_pushT) clearTimeout(_pushT);
    _pushT = setTimeout(pushCurrent, 1500);
  }
  async function pushCurrent(){
    if(isGuest()) return;
    if(!state.projectId) return;
    const list = listProjects();
    const p = list.find(x => x.id === state.projectId);
    if(!p) return;
    try{
      await fetch('/api/projects', {
        method:'POST',
        credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(p)
      });
    }catch{/* offline — fine, next save will retry */}
  }
  async function deleteCloudProject(id){
    if(isGuest()) return;
    try{
      await fetch('/api/projects?id=' + encodeURIComponent(id), {
        method:'DELETE', credentials:'include'
      });
    }catch{}
  }

  // Merge a cloud projects array into the local list. Latest-updatedAt wins.
  function mergeCloudIntoLocal(cloudList){
    if(!cloudList || !cloudList.length) return false;
    const local = listProjects();
    const byId = new Map(local.map(p => [p.id, p]));
    let changed = false;
    for(const c of cloudList){
      const l = byId.get(c.id);
      if(!l){
        // Cloud has a project we don't — pull its full doc on demand later
        byId.set(c.id, c);
        changed = true;
      } else {
        if(new Date(c.updatedAt||0) > new Date(l.updatedAt||0)){
          // Cloud is newer — keep local doc but update metadata
          byId.set(c.id, {...c, doc: l.doc});
          changed = true;
        }
      }
    }
    if(changed) writeProjects(Array.from(byId.values()));
    return changed;
  }

  // Hook: every time we save locally, schedule a cloud push.
  const origSave = window.saveCurrentProject;
  window.saveCurrentProject = function(){
    const ok = origSave();
    if(ok) schedulePush();
    return ok;
  };
  // Hook: deletes also propagate.
  const origDelete = window.deleteProject;
  window.deleteProject = function(id){
    const r = origDelete(id);
    deleteCloudProject(id);
    return r;
  };

  // On Dashboard render, pull cloud and merge in the background.
  window.cloudHydrateDashboard = async function(){
    if(isGuest()) return false;
    const cloud = await listCloudProjects();
    const changed = mergeCloudIntoLocal(cloud);
    if(changed && window.renderDashboard) window.renderDashboard();
    return changed;
  };

  // On opening a project: if the local doc is empty/stale and cloud has it,
  // pull the full doc transparently.
  const origOpen = window.openProject;
  window.openProject = function(id){
    const ok = origOpen(id);
    if(ok && !isGuest()){
      // Background: fetch the cloud version's doc and re-apply if newer
      fetchCloudProject(id).then(p=>{
        if(!p) return;
        const localList = listProjects();
        const local = localList.find(x => x.id === id);
        if(!local) return;
        if(new Date(p.updatedAt||0) > new Date(local.updatedAt||0)){
          const idx = localList.findIndex(x => x.id === id);
          localList[idx] = p;
          writeProjects(localList);
          if(state.projectId === id && p.doc){
            applyProjectDoc(p.doc);
            if(window.render) window.render();
          }
        }
      });
    }
    return ok;
  };

  window.cloudAvailable = cloudAvailable;
})();
