import re

path = r'c:\Users\Shadow 13 Solutions\Desktop\Field ACQ Ordinance Aide\Field ACQ Ordinance Aide\src\routes\scene-3d.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Default to UnderwritingCost
content = content.replace('useState<ActiveTab>("Studio3D");', 'useState<ActiveTab>("UnderwritingCost");')

# Remove the HouseModelViewer component entirely and its wrapper.
# Looking for:
#           {/* 3D Canvas Host Container with Error Boundary */}
#           <div className="relative w-full h-[580px] md:h-[640px] rounded-xl overflow-hidden shadow-lg border border-border">
#             <ErrorBoundary
# ...
#               />
#             </ErrorBoundary>
#           </div>

# We can just use a regex to remove this whole block
pattern = re.compile(r'\{\/\*\s*3D Canvas Host Container with Error Boundary\s*\*\/\}.*?<\/ErrorBoundary>\s*<\/div>', re.DOTALL)
content = pattern.sub('', content)

# Remove the Studio3D tab button
tab_pattern = re.compile(r'<button\s*onClick=\{\(\) => setActiveTab\("Studio3D"\)\}.*?<\/button>', re.DOTALL)
content = tab_pattern.sub('', content)

# Also remove the sceneMode and houseStudio buttons from the top bar
mode_toggle_pattern = re.compile(r'\{\/\*\s*Mode Toggle Button\s*\*\/\}.*?<\/div>', re.DOTALL)
content = mode_toggle_pattern.sub('', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated scene-3d.tsx")
