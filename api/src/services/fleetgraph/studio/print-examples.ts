import { getFleetGraphStudioExamples } from './examples.js'

for (const example of getFleetGraphStudioExamples()) {
  console.log(`\n# ${example.id}\n`)
  console.log(JSON.stringify(example.input, null, 2))
  if (example.notes.length > 0) {
    console.log('\nNotes:')
    for (const note of example.notes) {
      console.log(`- ${note}`)
    }
  }
}
