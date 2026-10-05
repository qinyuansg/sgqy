import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
export const needs=['_test2'];
export default async function create(ctx){
  const {cam}=ctx;
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x05070c);
  const pm=new THREE.PMREMGenerator(ctx.renderer); scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture; scene.environmentIntensity=0.25;
  const camera=new THREE.PerspectiveCamera(30,ctx.aspect,0.05,100);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0x2a2622,roughness:0.5})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(0.8,1,0.8),new THREE.MeshStandardMaterial({color:0x1c1f26,roughness:0.7})); plinth.position.y=0.5; plinth.castShadow=plinth.receiveShadow=true; scene.add(plinth);
  const brass=new THREE.MeshStandardMaterial({color:0xb5894a,metalness:1,roughness:0.35});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.15,0.02,24,96),brass); ring.rotation.x=-Math.PI/2; ring.position.y=1.03; ring.castShadow=true; scene.add(ring);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.01,64),brass); disc.position.y=1.02; scene.add(disc);
  const spot=new THREE.SpotLight(0xd8e4ff,25,10,0.35,0.6,2); spot.position.set(0.5,3,0.6); spot.target=plinth; spot.castShadow=true; spot.shadow.mapSize.set(1024,1024); scene.add(spot);
  const rt=ctx.makeRT(640,268);
  const glassMat=new THREE.MeshBasicMaterial({map:rt.texture,transparent:true,opacity:0.55,blending:THREE.AdditiveBlending,depthWrite:false});
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.67),glassMat); glass.position.set(0,1.4,0.6); scene.add(glass);
  for(let i=0;i<6;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(0.6,1,0.6),plinth.material); p.position.set(-3+i*1.4,0.5,-3); scene.add(p);}
  return {scene,camera,post:{bloom:{strength:0.5}},setShot(shot,tl,u,T){
    ctx.renderNested('_test2','lantern',tl,u,T,rt);
    if(shot.id==='T001'){ cam.move(camera,{pos:[0.3,1.25,1.4],target:[0,1.03,0],mm:65},{pos:[-0.3,1.3,1.6],target:[0,1.03,0],mm:65},u); return {dof:{focus:cam.distTo(camera,[0,1.03,0]),fstop:2.0}}; }
    cam.place(camera,[2.5,1.6,3.5],[0,1,0]); cam.lens(camera,35); cam.handheld(camera,T,1);
    return {dof:{focus:cam.distTo(camera,[0,1,0]),fstop:2.8}};
  }};
}
