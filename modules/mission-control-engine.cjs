/* Pure read model. No storage, DOM, networking or duplicate mission state. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./survival-engine.cjs'),require('./operations-engine.cjs'));else root.JEZERO_CONTROL_ENGINE=factory(root.JEZERO_SURVIVAL_ENGINE,root.JEZERO_OPERATIONS_ENGINE);})(typeof globalThis!=='undefined'?globalThis:this,(survival,operations)=>{
  const VERSION='4.0.0-p0';
  function overview({mission=null,draft=null,config={},dataset=null,equipmentConfirmed=false,inputsValid=true,support={}}={},now=Date.now()){
    if(!Number.isFinite(now))throw Error('Invalid evaluation time');
    const validRoute=!!(mission&&Number.isFinite(mission.duration)&&mission.duration>=0&&mission.legs?.length);
    let normalized=null,weather=null,evaluation=null;const errors=[];
    try{normalized=survival.config(config);}catch{errors.push('config');}
    if(dataset){try{weather=survival.weatherData(dataset);}catch{errors.push('weather');}}
    if(validRoute&&normalized&&weather&&equipmentConfirmed&&inputsValid)evaluation=survival.evaluate(mission,normalized,dataset);
    let assessment=null,plan=null;
    try{plan=operations.state(support);assessment=operations.assess(plan,{mission:validRoute?mission:null,survival:evaluation,crew:normalized?.crew},now);}catch{errors.push('support');}
    const duration=assessment?.durationHours??(validRoute?mission.duration:null);
    const metric=(id,value,unit,kind,source,model,reserve=null,range=null)=>({id,value:Number.isFinite(value)?value:null,unit,kind:Number.isFinite(value)?kind:'unknown',source:Number.isFinite(value)?source:'missing',model,reserve:Number.isFinite(reserve)?reserve:null,range:Number.isFinite(value)&&Array.isArray(range)&&range.every(Number.isFinite)&&range[0]!==range[1]?range:null,uncertainty:model==='survival'?'apollo-observed-range':'input-uncertainty-not-quantified'});
    const indicators=[
      metric('duration',duration,'h','calculated',evaluation?'scenario':'route',evaluation?'survival':'route'),
      metric('oxygen',evaluation?.oxygen?.remainingKg,'kg/person','inferred',evaluation?.oxygen?.source==='declared'?'declared-rate':'apollo-pandolf-model','survival',evaluation?.oxygen?.reserveKg,evaluation?.oxygen?.remainingRangeKg),
      metric('battery',evaluation?.battery?.remainingKWh,'kWh/person','inferred','declared-equipment-hypothetical-model','survival',evaluation?.battery?.reserveKWh),
      metric('water',assessment?.water?.provenance?assessment.water.remaining:null,'L/person','calculated','operator-declaration','support'),
      metric('co2',assessment?.co2?.provenance?assessment.co2.remaining:null,'kg/person','calculated','operator-declaration','support'),
      metric('thermal',assessment?.thermal?.provenance?assessment.thermal.remaining:null,'kWh/person','calculated','operator-declaration','support')
    ];
    return {version:VERSION,evaluatedAt:new Date(now).toISOString(),routeAvailable:validRoute,crew:normalized?.crew??null,crewKind:'hypothetical',missionName:typeof draft?.missionMeta?.missionName==='string'?draft.missionMeta.missionName.slice(0,160):'',waypoints:Array.isArray(draft?.points)?draft.points.length:0,indicators,missing:indicators.filter(x=>x.value===null).map(x=>x.id),errors,
      prerequisites:{route:validRoute,weather:!!weather,equipment:equipmentConfirmed&&inputsValid&&!!normalized},
      weather:weather?{kind:'imported',source:weather.source.name,sourceVerified:false,latestSol:weather.lastSol,records:weather.records.length,freshness:'UTC freshness cannot be inferred from a sol index alone'}:{kind:'unknown'},
      assessment,evaluation,equipmentFaults:assessment?.equipment?.faults?.length??null,procedureCount:plan?.procedures?.length??0,shelterCount:plan?.shelters?.length??0,
      certified:false,authorization:false};
  }
  return Object.freeze({VERSION,overview});
});
