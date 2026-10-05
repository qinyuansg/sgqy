import * as THREE from 'three';
export default async function create(ctx){
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x0b1a3a); scene.fog=new THREE.FogExp2(0x0b1a3a,0.05);
  const camera=new THREE.PerspectiveCamera(40,1,0.1,200);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(200,200,1,1),new THREE.MeshStandardMaterial({color:0x0a2040,roughness:0.15,metalness:0.2})); sea.rotation.x=-Math.PI/2; scene.add(sea);
  const lamp=new THREE.PointLight(0xffb060,30,30,2); lamp.position.set(0,1.5,-6); scene.add(lamp);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.08),new THREE.MeshBasicMaterial({color:new THREE.Color(8,5,2)})); lamp.add(bulb);
  scene.add(new THREE.HemisphereLight(0x3050a0,0x000010,0.4));
  return {scene,camera,setShot(shot,tl,u,T){ lamp.position.y=1.5+0.2*Math.sin(T*2); camera.position.set(0,1.2,0); camera.lookAt(0,1.2,-6); }};
}
