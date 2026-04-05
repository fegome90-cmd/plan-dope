export function registerCommands(program) {
    program
        .command('create')
        .description('Iniciar authoring y crear esqueleto de plan.md')
        .option('-p, --project <path>', 'Path del proyecto target')
        .option('--id <plan-id>', 'ID del plan (auto-generado si no se pasa)')
        .action(async (opts) => {
        const { createCommand } = await import('./commands/create.js');
        createCommand(program, opts);
    });
    program
        .command('derive')
        .description('Derivar plan.yaml desde plan.md')
        .option('-p, --project <path>', 'Path del proyecto target')
        .option('--plan-id <plan-id>', 'ID del plan a derivar')
        .action(async (opts) => {
        const { deriveCommand } = await import('./commands/derive.js');
        deriveCommand(program, opts);
    });
    program
        .command('validate')
        .description('Validar plan.yaml y producir validation-report.yaml')
        .option('-p, --project <path>', 'Path del proyecto target')
        .option('--plan-id <plan-id>', 'ID del plan a validar')
        .action(async (opts) => {
        const { validateCommand } = await import('./commands/validate.js');
        validateCommand(program, opts);
    });
    program
        .command('review')
        .description('Revisar plan y producir review-report.md')
        .option('-p, --project <path>', 'Path del proyecto target')
        .option('--plan-id <plan-id>', 'ID del plan a revisar')
        .action(async (opts) => {
        const { reviewCommand } = await import('./commands/review.js');
        reviewCommand(program, opts);
    });
    program
        .command('checkpoint')
        .description('Delegar a checkpoint-card para producir handoff')
        .option('-p, --project <path>', 'Path del proyecto target')
        .option('--plan-id <plan-id>', 'ID del plan')
        .option('-r, --reason <reason>', 'Razón de handoff: pause, transfer, completion', 'transfer')
        .action(async (opts) => {
        const { checkpointCommand } = await import('./commands/checkpoint.js');
        checkpointCommand(program, opts);
    });
    program
        .command('wizard')
        .description('Orquestar interactivamente create → derive → validate → review → checkpoint')
        .option('-p, --project <path>', 'Path del proyecto target')
        .action(async (opts) => {
        const { wizardCommand } = await import('./commands/wizard.js');
        wizardCommand(program, opts);
    });
    program
        .command('completion <shell>')
        .description('Generate shell completion script (bash, zsh, fish)')
        .action((shell) => {
        const script = generateCompletion(shell, program);
        if (script) {
            process.stdout.write(script);
        }
        else {
            process.stderr.write(`Unsupported shell: ${shell}. Supported: bash, zsh, fish\n`);
            process.exit(1);
        }
    });
}
function generateCompletion(shell, program) {
    const commands = program.commands;
    const cmdNames = commands.map((c) => c.name()).join(' ');
    const cmdList = commands.map((c) => c.name());
    const allOptions = [
        ...new Set(commands.flatMap((c) => c.options.map((o) => o.long || o.short)).filter(Boolean)),
    ].join(' ');
    if (shell === 'bash') {
        return `_plan_dope_completion() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local prev="\${COMP_WORDS[COMP_CWORD-1]}"
  local commands="${cmdNames}"
  local options="${allOptions}"

  if [[ "\${COMP_CWORD}" -eq 1 ]]; then
    COMPREPLY=($(compgen -W "\${commands}" -- "\${cur}"))
  else
    COMPREPLY=($(compgen -W "\${options}" -- "\${cur}"))
  fi
}
complete -F _plan_dope_completion plan
`;
    }
    if (shell === 'zsh') {
        return `#compdef plan

_plan_dope_completion() {
  local -a commands
  commands=(
${cmdList.map((name) => `    '${name}:command'`).join('\n')}
  )

  local -a options
  options=(
    '(-p --project)'{-p,--project}'[Path del proyecto target]:path:_files'
    '(--plan-id)'{--plan-id}'[ID del plan]:id'
    '(--id)'{--id}'[ID del plan]:id'
    '(-r --reason)'{-r,--reason}'[Razón de handoff]:(pause transfer completion)'
  )

  _arguments -C \\
    '1: :->command' \\
    '*: :->args' && return 0

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      _describe 'option' options
      ;;
  esac
}

_plan_dope_completion
`;
    }
    if (shell === 'fish') {
        return `# Fish shell completion for plan_dope
${commands.map((c) => c.name()).map((name) => `complete -c plan -n "__fish_use_subcommand" -a ${name}`).join('\n')}
${commands
            .flatMap((c) => [
            `complete -c plan -n "__fish_seen_subcommand_from ${c.name()}" -l project -d "Path del proyecto target"`,
            `complete -c plan -n "__fish_seen_subcommand_from ${c.name()}" -l plan-id -d "ID del plan"`,
            `complete -c plan -n "__fish_seen_subcommand_from ${c.name()}" -l id -d "ID del plan"`,
            `complete -c plan -n "__fish_seen_subcommand_from checkpoint" -l reason -d "Razón de handoff" -a "pause transfer completion"`,
        ])
            .join('\n')}
`;
    }
    return null;
}
//# sourceMappingURL=cli.js.map