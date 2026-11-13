/**
 * Personal Productivity System – Google Apps Script API
 * Bind this script to the imported Google Sheet.
 *
 * Setup:
 * 1) Set SPREADSHEET_ID in Script Properties (or leave blank for bound sheet).
 * 2) Set API_SECRET in Script Properties.
 * 3) Deploy as Web App, execute as Me, access as Anyone (only if protected by API_SECRET).
 *    For a personal production deployment, review Google account/org security policies.
 */
const CONFIG = {
  SHEETS: ['Nodes','Dependencies','Time_Logs','Reviews','History','Settings','AI_Suggestions'],
  NODE_HEADERS: ['node_id','parent_id','node_type','title','description','area_type','status','priority','start_date','due_date','completed_date','progress_pct','success_criteria','next_action','estimated_minutes','actual_minutes','owner','tags','is_example','created_at','updated_at','sort_order']
};

function doGet(e) {
  try {
    authorize_(e && e.parameter && e.parameter.token);
    const action = (e && e.parameter && e.parameter.action) || 'bootstrap';
    if (action === 'health') return json_({ok:true, app:'Productivity API', version:'0.1.0'});
    if (action === 'nodes') return json_({ok:true, data: readTable_('Nodes')});
    if (action === 'bootstrap') return json_({ok:true, data: bootstrap_()});
    return json_({ok:false, error:'Unknown GET action'});
  } catch (err) {
    return json_({ok:false, error:String(err.message || err)});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    authorize_(body.token);
    const action = body.action;
    if (action === 'createNode') return json_({ok:true, data:createNode_(body.node || {})});
    if (action === 'updateNode') return json_({ok:true, data:updateNode_(body.node || {})});
    if (action === 'deleteNode') return json_({ok:true, data:deleteNode_(body.node_id)});
    if (action === 'createTimeLog') return json_({ok:true, data:appendRecord_('Time_Logs', body.record || {})});
    if (action === 'saveReview') return json_({ok:true, data:appendRecord_('Reviews', body.record || {})});
    if (action === 'saveSuggestion') return json_({ok:true, data:appendRecord_('AI_Suggestions', body.record || {})});
    return json_({ok:false, error:'Unknown POST action'});
  } catch (err) {
    return json_({ok:false, error:String(err.message || err)});
  }
}

function setupDatabase() {
  const ss = getSpreadsheet_();
  CONFIG.SHEETS.forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      const headers = name === 'Nodes' ? CONFIG.NODE_HEADERS : defaultHeaders_(name);
      if (headers.length) sh.getRange(1,1,1,headers.length).setValues([headers]);
    }
    sh.setFrozenRows(1);
  });
  return 'Database checked. Existing data was preserved.';
}

function bootstrap_() {
  return {
    nodes: readTable_('Nodes'),
    settings: readTable_('Settings')
  };
}

function createNode_(node) {
  if (!node.title || !node.node_type) throw new Error('title and node_type are required');
  const now = new Date().toISOString();
  const record = Object.assign({
    node_id: Utilities.getUuid(),
    parent_id: '',
    description: '',
    area_type: '',
    status: 'Not Started',
    priority: 'Medium',
    start_date: '',
    due_date: '',
    completed_date: '',
    progress_pct: 0,
    success_criteria: '',
    next_action: '',
    estimated_minutes: '',
    actual_minutes: '',
    owner: 'Me',
    tags: '',
    is_example: 'FALSE',
    created_at: now,
    updated_at: now,
    sort_order: 0
  }, node, {updated_at:now});
  appendObject_('Nodes', record);
  history_('Node', record.node_id, 'CREATE', null, record);
  return record;
}

function updateNode_(node) {
  if (!node.node_id) throw new Error('node_id is required');
  const sh = getSpreadsheet_().getSheetByName('Nodes');
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('node_id');
  for (let i=1; i<values.length; i++) {
    if (String(values[i][idCol]) === String(node.node_id)) {
      const old = rowToObject_(headers, values[i]);
      const merged = Object.assign({}, old, node, {updated_at:new Date().toISOString()});
      sh.getRange(i+1,1,1,headers.length).setValues([headers.map(h => merged[h] === undefined ? '' : merged[h])]);
      history_('Node', node.node_id, 'UPDATE', old, merged);
      return merged;
    }
  }
  throw new Error('Node not found');
}

function deleteNode_(nodeId) {
  if (!nodeId) throw new Error('node_id is required');
  const sh = getSpreadsheet_().getSheetByName('Nodes');
  const values = sh.getDataRange().getValues();
  const headers = values[0], idCol = headers.indexOf('node_id'), parentCol = headers.indexOf('parent_id');
  // Prevent accidental orphaning: require children to be moved/deleted first.
  const hasChildren = values.slice(1).some(r => String(r[parentCol]) === String(nodeId));
  if (hasChildren) throw new Error('This node has children. Move or delete child nodes first.');
  for (let i=1; i<values.length; i++) {
    if (String(values[i][idCol]) === String(nodeId)) {
      const old = rowToObject_(headers, values[i]);
      sh.deleteRow(i+1);
      history_('Node', nodeId, 'DELETE', old, null);
      return {deleted:nodeId};
    }
  }
  throw new Error('Node not found');
}

function appendRecord_(sheetName, record) {
  const obj = Object.assign({}, record);
  if (!obj[Object.keys(obj)[0]]) obj[Object.keys(obj)[0]] = Utilities.getUuid();
  if (!obj.created_at) obj.created_at = new Date().toISOString();
  appendObject_(sheetName, obj);
  return obj;
}

function appendObject_(sheetName, obj) {
  const sh = getSpreadsheet_().getSheetByName(sheetName);
  if (!sh) throw new Error('Missing sheet: ' + sheetName);
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  sh.appendRow(headers.map(h => obj[h] === undefined ? '' : obj[h]));
}

function readTable_(sheetName) {
  const sh = getSpreadsheet_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  return values.filter(r => r.some(v => v !== '')).map(r => rowToObject_(headers,r));
}

function rowToObject_(headers,row) {
  const out = {};
  headers.forEach((h,i) => out[h] = row[i] instanceof Date ? row[i].toISOString() : row[i]);
  return out;
}

function history_(type,id,action,oldValue,newValue) {
  appendObject_('History', {
    history_id:Utilities.getUuid(), entity_type:type, entity_id:id, action:action,
    old_value_json:oldValue ? JSON.stringify(oldValue) : '',
    new_value_json:newValue ? JSON.stringify(newValue) : '',
    changed_at:new Date().toISOString(), changed_by:'Apps Script API'
  });
}

function authorize_(provided) {
  const expected = PropertiesService.getScriptProperties().getProperty('API_SECRET');
  if (!expected) throw new Error('API_SECRET is not configured in Script Properties');
  if (!provided || provided !== expected) throw new Error('Unauthorized');
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function defaultHeaders_(name) {
  const map = {
    Dependencies:['dependency_id','from_node_id','to_node_id','dependency_type','status','notes','created_at'],
    Time_Logs:['log_id','node_id','work_date','start_time','end_time','duration_minutes','work_summary','blocker','created_at'],
    Reviews:['review_id','review_type','review_date','period_start','period_end','wins','unfinished_items','blockers','decisions','next_week_focus','created_at'],
    History:['history_id','entity_type','entity_id','action','old_value_json','new_value_json','changed_at','changed_by'],
    Settings:['setting_key','setting_value','description'],
    AI_Suggestions:['suggestion_id','parent_node_id','suggested_node_type','suggested_title','suggested_description','suggested_success_criteria','estimated_minutes','reasoning','approval_status','created_at','reviewed_at','approved_node_id']
  };
  return map[name] || [];
}
