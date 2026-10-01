/* Optional GPU finishing pass over the arena. Source meshes/UVs remain intact. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.RoyaleUltra=api;})(globalThis,function(root){'use strict';
const states=new WeakMap();let lastError=null,frames=0;
const vertex='attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
const fragment=`precision mediump float; varying vec2 uv; uniform sampler2D scene; uniform vec2 pixel;
void main(){vec4 center=texture2D(scene,uv);vec3 a=texture2D(scene,uv+vec2(pixel.x,0.)).rgb,b=texture2D(scene,uv-vec2(pixel.x,0.)).rgb,c=texture2D(scene,uv+vec2(0.,pixel.y)).rgb,d=texture2D(scene,uv-vec2(0.,pixel.y)).rgb;
vec3 lo=min(center.rgb,min(min(a,b),min(c,d))),hi=max(center.rgb,max(max(a,b),max(c,d)));vec3 color=clamp(center.rgb+(center.rgb-(a+b+c+d)*.25)*.22,lo,hi);
float luminance=dot(color,vec3(.2126,.7152,.0722));color=mix(vec3(luminance),color,1.035);
vec3 glow=max(vec3(0.),(a+b+c+d)*.25-vec3(.78));color+=glow*.10;
color=clamp((color-.5)*1.015+.5,0.,1.);gl_FragColor=vec4(color,center.a);}`;
function enabled(g){return g?.postProcessing===true&&!g.potato;}
function setup(canvas){const output=document.createElement('canvas'),gl=output.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,depth:false,stencil:false,preserveDrawingBuffer:false});if(!gl)return{disabled:true};
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;},program=gl.createProgram();
 const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.uniform1i(gl.getUniformLocation(program,'scene'),0);
 const state={gl,output,program,texture,pixel:gl.getUniformLocation(program,'pixel'),width:0,height:0,disabled:false};output.addEventListener('webglcontextlost',e=>{e.preventDefault();state.disabled=true;});output.addEventListener('webglcontextrestored',()=>states.delete(canvas));return state;
}
function present(ctx){if(!enabled(root.RoyaleGraphics?.current)||!ctx?.canvas||typeof document==='undefined')return false;const canvas=ctx.canvas;let state=states.get(canvas);if(!state){try{state=setup(canvas);}catch(e){lastError=e.message;state={disabled:true};}states.set(canvas,state);}if(state.disabled)return false;
 try{const {gl,output}=state;if(state.width!==canvas.width||state.height!==canvas.height){output.width=state.width=canvas.width;output.height=state.height=canvas.height;gl.viewport(0,0,state.width,state.height);gl.uniform2f(state.pixel,1/state.width,1/state.height);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,state.width,state.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);}
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='copy';ctx.drawImage(output,0,0);ctx.restore();frames++;return true;
 }catch(e){state.disabled=true;lastError=e.message;return false;}
}
return{present,enabled,summary:()=>({frames,error:lastError}),vertex,fragment};});
