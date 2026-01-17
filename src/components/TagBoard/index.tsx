import { useUsers, useInstanceState, Interactable } from '@xrift/world-components'
import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { type Group } from 'three'
import { RigidBody } from '@react-three/rapier'

interface PlayerMovement {
  position: { x: number; y: number; z: number }
  rotation: { yaw: number; pitch: number }
}

interface Tag {
  id: string
  label: string
  color: string
}

interface TagBoardProps {
  tags: Tag[]
  title?: string
  position?: [number, number, number]
  rotation?: [number, number, number]
}

interface TagDisplayProps {
  userId: string
  getMovement: (userId: string) => PlayerMovement | undefined
  tags: Tag[]
}

const TagDisplay = ({ userId, getMovement, tags }: TagDisplayProps) => {
  const groupRef = useRef<Group>(null)
  const [selectedTagId] = useInstanceState<string | null>(
    `tag-${userId}`,
    null
  )

  useFrame(() => {
    if (!userId) return
    const movement = getMovement(userId)
    if (!movement || !groupRef.current) return

    groupRef.current.position.set(
      movement.position.x,
      movement.position.y + 1.8,
      movement.position.z
    )
  })

  const selectedTag = tags.find(tag => tag.id === selectedTagId)

  if (!selectedTag) return null

  return (
    <group ref={groupRef}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <group>
          {/* 背景 */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.2, 0.3]} />
            <meshBasicMaterial color={0x000000} opacity={0.7} transparent />
          </mesh>
          {/* タグテキスト */}
          <Text
            position={[0, 0, 0]}
            fontSize={0.12}
            color={selectedTag.color}
            anchorX="center"
            anchorY="middle"
          >
            {selectedTag.label}
          </Text>
        </group>
      </Billboard>
    </group>
  )
}

interface TagSelectorProps {
  tags: Tag[]
  title: string
  position: [number, number, number]
  rotation: [number, number, number]
}

const TagSelector = ({ tags, title, position, rotation }: TagSelectorProps) => {
  const { localUser } = useUsers()
  const [, setSelectedTagId] = useInstanceState<string | null>(
    `tag-${localUser?.id}`,
    null
  )

  const handleTagClick = (tagId: string) => {
    setSelectedTagId((prev) => prev === tagId ? null : tagId)
  }

  return (
    <group position={position} rotation={rotation}>
      {/* タイトル */}
      <Text
        position={[0, 1.5, 0.01]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {title}
      </Text>

      {/* タグボタン */}
      <group position={[0, 0, 0.01]}>
        {tags.map((tag, index) => {
          const yPos = 0.8 - index * 0.4
          
          return (
            <group key={tag.id} position={[0, yPos, 0]}>
              <RigidBody type="fixed" colliders="cuboid">
                <Interactable
                  id={`tag-button-${tag.id}`}
                  onInteract={() => handleTagClick(tag.id)}
                  interactionText={tag.label}
                >
                  {/* タグボタン背景 */}
                  <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[2, 0.3, 0.1]} />
                    <meshStandardMaterial 
                      color={tag.color}
                      opacity={0.9}
                      transparent
                    />
                  </mesh>
                </Interactable>
              </RigidBody>
              {/* タグラベル */}
              <Text
                position={[0, 0, 0.06]}
                fontSize={0.15}
                color={0xffffff}
                anchorX="center"
                anchorY="middle"
              >
                {tag.label}
              </Text>
            </group>
          )
        })}
      </group>
    </group>
  )
}

export const TagBoard = ({ tags, title = 'ステータスタグ選択', position = [9.5, 2, 0], rotation = [0, -Math.PI / 2, 0] }: TagBoardProps) => {
  const { remoteUsers, getMovement, getLocalMovement, localUser } = useUsers()

  return (
    <>
      {/* タグ選択ボード */}
      <TagSelector tags={tags} title={title} position={position} rotation={rotation} />

      {/* ローカルユーザーのタグ表示 */}
      {localUser && (
        <TagDisplay
          userId={localUser.id}
          getMovement={getLocalMovement}
          tags={tags}
        />
      )}
      {/* リモートユーザーのタグ表示 */}
      {remoteUsers.map((user) => (
        <TagDisplay
          key={user.id}
          userId={user.id}
          getMovement={getMovement}
          tags={tags}
        />
      ))}
    </>
  )
}

