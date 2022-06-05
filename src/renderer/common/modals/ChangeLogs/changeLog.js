export default {
  new: [
    {
      header: 'Started rollout of custom APIs',
      content:
        'because CurseForge is planning to close their APIs in the future. ' +
        'These custom APIs are disabled at the moment.',
      advanced: { cm: '2b37e27a', ms: 'Noo CurseForge, why?' }
    }
  ],
  improvements: [
    {
      header: 'Added a "Check for updates" button',
      content: 'to release CurseForge from a lot of automated API requests',
      advanced: { cm: 'f12465f2' }
    }
  ],
  bugfixes: [
    {
      header: 'Fixed 7zip not unzipping',
      content: 'the downloaded files.',
      advanced: {
        cm: '2240004d',
        ms:
          'You want to know the true story? He did this, then I told him ' +
          "that it doesn't work so he did it again and it partially worked. " +
          'Then, third time, he stole my working code and committed it! :o'
      }
    }
  ]
}
