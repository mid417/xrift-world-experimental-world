import { Mirror, ScreenShareDisplay, SpawnPoint } from '@xrift/world-components'
import { RigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import { Mesh } from 'three'
import { RotatingObject } from './components/RotatingObject'
import { Skybox } from './components/Skybox'
import { TagBoard } from './components/TagBoard'
import { COLORS, WORLD_CONFIG } from './constants'

export interface WorldProps {
  position?: [number, number, number]
  scale?: number
}

export const World: React.FC<WorldProps> = ({ position = [0, 0, 0], scale = 1 }) => {
  const groundRef = useRef<Mesh>(null)
  const worldSize = WORLD_CONFIG.size * scale

  return (
    <group position={position} scale={scale}>
      {/* Skybox - 360度パノラマ背景 */}
      <Skybox radius={500} />

      {/* プレイヤーのスポーン地点 */}
      <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <SpawnPoint />
      </group>

      {/* 照明設定 */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0005}
      />

      {/* 地面 */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[worldSize, worldSize]} />
          <meshLambertMaterial color={COLORS.ground} />
        </mesh>
      </RigidBody>


      {/* 鏡 - ワールドの中央に配置 */}
      <Mirror
        position={[0, 1.5 * scale, -9.5]}
        size={[4 * scale, 3 * scale]}
      />

      {/* 画面共有ディスプレイ - 左側の壁に配置 */}
      <ScreenShareDisplay
        id='screen-share-1'
        position={[-9.72, 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* アニメーション: ぐるぐる回るオブジェクト */}
      <RotatingObject
        radius={4}
        speed={1}
        height={2}
        scale={scale}
      />

      {/* タグボード - ユーザーがタグを選択して状態を表示（東の壁に配置） */}
      <TagBoard
        tags={[
          [
            { color: '#8BC34A', id: 'working'    , label: '作業中' },
            { color: '#BF7B41', id: 'away'       , label: '離席中' },
            { color: '#95A5A6', id: 'silent'     , label: '無言' },
          ],
          [
            { color: '#FF9800', id: 'cat'        , label: 'ねこ' },
          ],
        ]}
        title="タグ選択"
        storageKey="tommyuh-experimental-world"
        position={[-2.73, 1.5, -3]}
        rotation={[0, 0, 0]}
        scale={scale}
      />
    </group>
  )
}
